/**
 * Custom hook for form submission state checking
 * Extracted from multiple components to eliminate code duplication
 */

import { useNavigation } from "react-router";

export function useFormSubmission(intent: string) {
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === intent;

  return {
    isSubmitting,
    navigation
  };
}

// Specific hooks for common intents
export function useJobCancelSubmission() {
  return useFormSubmission("cancel-job");
}

export function useJobDeleteSubmission() {
  return useFormSubmission("delete-job");
}

export function useJobCreateSubmission() {
  return useFormSubmission("create-job");
}

export function useJobEditSubmission() {
  return useFormSubmission("edit-job");
}