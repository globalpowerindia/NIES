/** "+919876543210" → "+91 9876543210", as the designs show numbers. */
export const displayPhone = (phone: string) =>
  phone.startsWith('+91') ? `+91 ${phone.slice(3)}` : phone
