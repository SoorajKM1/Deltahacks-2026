export const checkPrivacy = (text: string) => {
  let cleanText = text;
  let triggered = false;
  
  // 1. The "Banned Words" List (Customize for your demo!)
  if (cleanText.toLowerCase().includes("password")) {
    cleanText = cleanText.replace(/password\s+is\s+\w+/gi, "[PASSWORD REDACTED]");
    triggered = true;
  }
  
  // 2. Sensitive Numbers
  if (cleanText.includes("1234")) { 
    cleanText = cleanText.replace("1234", "[PIN REDACTED]");
    triggered = true;
  }
  
  return { cleanText, triggered };
};