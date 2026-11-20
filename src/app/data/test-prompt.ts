/**
 * A structured prompt to try the models on the same task: extract fields from an
 * email and classify its urgency, in a fixed output format.
 */
export const TEST_PROMPT = `OBJECTIVE
Extract key details from the customer email below and classify its urgency.

RULES
- Use only the information in the email.
- Keep each answer to 1-5 words.
- Do not add any text outside the output format.

DATA
Email: "Hi, I'm Marco from Acme Corp. Our checkout page stopped working 10 minutes ago and customers cannot pay! Please call me back ASAP at 555-0199."

METHOD
1. Find the sender's name and company.
2. Identify the main problem.
3. Set urgency to HIGH (payment/system down), MEDIUM (bug), or LOW (question).
4. Extract the phone number.

OUTPUT FORMAT
Name: [Sender name]
Company: [Company name]
Problem: [Short description]
Urgency: [HIGH / MEDIUM / LOW]
Phone: [Phone number]`;
