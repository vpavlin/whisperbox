import EventEmitter from "events"
import getDispatcher, { Dispatcher} from "waku-dispatcher"
import { bytesToUtf8,  IWaku, LightNode, Protocols, SDKProtocolResult, utf8ToBytes,  } from "@waku/sdk";
import { addConfirmation, addForm, canAccessForm, getAllForms, getFormById, getFormsByCreator, loadStoredForm, storeForm, submitResponse, toByteArray, toHexString, validateFormCreator } from "./formStore";
import { FormSubmissionParams, FormType, ResponseConfirmation } from "@/types";
import { EncryptedFormSubmissionParams } from "@/types/waku";
import { decryptAsymmetric, encryptAsymmetric } from "@waku/message-encryption/ecies";
import { CONTENT_TOPIC } from "@/config/waku";
import { addPublicForm } from "./publicFormFeed";



export enum ClientState {
    INITIALIZED = "initialized",
    INITIALIZING = "initializing",
    FAILED = "failed,"
}

export enum ClientEvents {
    STATE_UPDATE = "state_update",
    NEW_RESPONSE = "new_response",
    NEW_FORM = "new_form",
    NEW_PUBLIC_FORM = "new_public_form"
}

export enum MessageTypes {
    NEW_FORM = "new_form",
    FORM_RESPONSE = "form_response",
    CONFIRMATION_RESPONSE = "confirmation_response"
}


export class WakuClient extends EventEmitter {

    state:ClientState | undefined = undefined

    node:LightNode | undefined = undefined
    dispatcher:Dispatcher | null = null
    address:string | undefined = undefined
    currentFormId: string | undefined = undefined

    constructor(node:LightNode | undefined) {
        super();

        this.node = node
    }

    public async init() {
        if (this.state == ClientState.INITIALIZED) {
            console.error("Already initialized")
            return
        }
        this.state = ClientState.INITIALIZING
        console.log("WakuClient: Initializing")
        this.emit(ClientEvents.STATE_UPDATE, this.state)

        try {
            if(!this.dispatcher) {
                console.log("Getting dispatcher")
                const disp = await getDispatcher(this.node!, CONTENT_TOPIC, "whisperbox", false, false)
                if (!disp) {
                    throw new Error("Failed to initialize Waku Dispatcher")
                }
                this.dispatcher = disp

                this.emit(ClientEvents.STATE_UPDATE, this.state)

                this.state = ClientState.INITIALIZED
                this.emit(ClientEvents.STATE_UPDATE, this.state)
                console.log("WakuClient", disp)


            }
            if (!this.dispatcher) {
                this.state = ClientState.FAILED
                this.emit(ClientEvents.STATE_UPDATE, this.state)
                console.log("Dispatcher failed to initialize")

                return
            }


            this.dispatcher.on(MessageTypes.NEW_FORM, this.handleNewForm.bind(this))
            this.dispatcher.on(MessageTypes.FORM_RESPONSE, this.handleResponse.bind(this))
            this.dispatcher.on(MessageTypes.CONFIRMATION_RESPONSE, this.handleConfirmation.bind(this))

            console.log("WakuClient: Dispatcher initialized")


            await this.dispatcher.start()
            try {
                await this.node!.waitForPeers([Protocols.Store]);

                console.log("Dispatching local query")
                await this.dispatcher.dispatchLocalQuery()


                if (getAllForms.length == 0) {
                    console.log("Dispatching general query")
                    await this.dispatcher.dispatchQuery()

                }

//                this.emit(ClientEvents.STATE_UPDATE, ClientState.INIT_PROTOCOL)
            } catch (e) {
                console.error("Failed to initialized protocol:", e)
                this.emit(ClientEvents.STATE_UPDATE, ClientState.FAILED)
                throw e
            }

        } catch(e) {
            this.state = ClientState.FAILED
            this.emit(ClientEvents.STATE_UPDATE, this.state)

            throw e
        }
    }

    public setAddress(address: string):void {
        this.address = address
    }

    public setCurrentFormId(id: string | undefined):void {
        this.currentFormId = id
    }


    private async handleNewForm(payload: FormType): Promise<void> {
        if (payload.whitelist.type == "none") {
            if(addPublicForm(payload)) {
                this.emit(ClientEvents.NEW_PUBLIC_FORM, {formId: payload.id})
            }
        }
        
        const form = getFormById(payload.id)

        if(!form) {
            const validation = validateFormCreator(payload);
            if (!validation.valid) {
                throw new Error(`Form creator signature validation failed: ${validation.error}`);
            }
            
            if (this.currentFormId != payload.id && payload.whitelist.type == "none") {
                try {
                    loadStoredForm(payload.id)
                } catch(e) {
                    throw new Error(`ignoring public form ${payload.id}`)
                }
            }

            if (!await canAccessForm(payload, this.address!)) {
                throw new Error("ignoring form I cannot access")
            }

            addForm(payload)
            this.emit(ClientEvents.NEW_FORM, {formId: payload.id})
            return
        }
        throw new Error("Form already exists")
    }

    private async handleResponse(payload: EncryptedFormSubmissionParams): Promise<void> {
        let response: FormSubmissionParams  | null = null
        if ((payload as EncryptedFormSubmissionParams).encryptedPayload) {
            const forms = getFormsByCreator(this.address!)
            for (const form of forms) {
                if (!form.privateKey) continue
                try {
                    const data = await decryptAsymmetric(new Uint8Array(toByteArray((payload as EncryptedFormSubmissionParams).encryptedPayload)), new Uint8Array(toByteArray(form.privateKey)))
                    response = JSON.parse(bytesToUtf8(data)) as FormSubmissionParams
                } catch (e) {
                    console.log(e)
                }
            }

        } else {
            throw new Error("Invalid payload - this shouldn't happen -- all responses being handled should be encrypted")
        }

        if (!response) {
            throw new Error("Failed to match response with a form")
        }
        const form = getFormById(response.formId)

        if(form && form.creator == this.address) {
            await submitResponse(response)
            await this.publishConfirmation(response)

            this.emit(ClientEvents.NEW_RESPONSE, { form, response: response });
        }
    }

    private async handleConfirmation(payload: ResponseConfirmation): Promise<void> {
        const form = getFormById(payload.formId)

        if(form) {
            addConfirmation(payload.formId, payload.confirmationId)
            return
        }

        throw new Error("Ignoring confirmation for unknown form")
    }

    public async publishForm(form: FormType): Promise<boolean> {
        if (this.dispatcher == null) {
            throw new Error("Dispatcher is not initialized")
        }

        const formToPublish = JSON.parse(JSON.stringify(form));
        formToPublish.privateKey = ""

        const result = await this.dispatcher.emitTo(this.dispatcher.encoder!, MessageTypes.NEW_FORM, formToPublish, undefined, undefined, true)
        console.debug(result)
        return (result as SDKProtocolResult).successes.length > 0
    }

    public async publishResponse(response: FormSubmissionParams): Promise<boolean> {
        if (this.dispatcher == null) {
            throw new Error("Dispatcher is not initialized")
        }

        const form = getFormById(response.formId)
        if (!form) {
            throw new Error("Form not found")
        }

        const encrypted = await encryptAsymmetric(utf8ToBytes(JSON.stringify(response)), new Uint8Array(toByteArray(form.publicKey)))

        const result = await this.dispatcher.emit(MessageTypes.FORM_RESPONSE, {encryptedPayload: toHexString(encrypted)} as EncryptedFormSubmissionParams)
        return result != false
    }

    public async publishConfirmation(response: FormSubmissionParams): Promise<boolean> {
        if (this.dispatcher == null) {
            throw new Error("Dispatcher is not initialized")
        }

        const form = getFormById(response.formId)
        if (!form) {
            throw new Error("Form not found")
        }

        if (!response.confirmationId) {
            return true
        }

        const result = await this.dispatcher.emit(MessageTypes.CONFIRMATION_RESPONSE, {formId: response.formId, confirmationId: response.confirmationId} as ResponseConfirmation)
        return result != false
    }
}