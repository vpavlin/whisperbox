/**
 * Form related type definitions
 */

export interface FormQuestion {
  id: string;
  type: 'text' | 'textarea' | 'multipleChoice' | 'checkbox';
  text: string;
  required: boolean;
  options?: string[]; // For multiple choice or checkbox
}

export interface FormType {
  id: string;
  title: string;
  description: string;
  creator: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
  expiresAt?: string; // Optional expiry timestamp
  questions: FormQuestion[];
  whitelist: {
    type: 'nft' | 'addresses' | 'none';
    value: string; // NFT contract address or comma-separated list of addresses or empty string for none
  };
  responses: FormResponse[];
  confirmations: string[];
}

export interface FormResponse {
  id: string;
  formId: string;
  respondent: string; // Wallet address
  respondentENS: string | null;
  submittedAt: number;
  signature: string;
  answers: {
    questionId: string;
    value: string | string[];
  }[];
  confirmationId: string | null;
}

export interface ResponseConfirmation {
  formId: string;
  confirmationId: string;
}

export interface StoredForm {
  id: string,
  privateKey: string
  type: StoredFormType
}

export enum StoredFormType {
  ACCESSIBLE = 'accessible',
  VIEWED = 'viewed',
  PARTICIPATED = 'participated',
  CREATOR = 'creator'
}

// Form creation parameter type (omitting generated fields)
export type FormCreationParams = Omit<FormType, 'id' | 'responses' | 'createdAt' | 'publicKey' | 'privateKey' | 'confirmations'>;

// Form submission parameter type (omitting generated fields)
export type FormSubmissionParams = Omit<FormResponse, 'id' | 'respondentENS'>;