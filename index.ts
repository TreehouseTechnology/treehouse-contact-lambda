import { APIGatewayProxyHandler } from "aws-lambda";
import { treeifyError, z, ZodError } from "zod";
import nodemailer from "nodemailer";

// Define schema
const ContactEmailSchema = z.object({
  name: z.string(),
  email: z.email(),
  message: z.string(),
});

// Email utility
const generateMessageBody = ({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) => `
  NAME: ${name}
  EMAIL: ${email}
  MESSAGE: "${message}"
`;

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

// Lambda entry point
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = ContactEmailSchema.parse(body);

    await transport.sendMail({
      to: process.env.NODEMAILER_EMAIL,
      from: process.env.NODEMAILER_EMAIL,
      subject: `Contact form submission: ${parsed.name} (${parsed.email})`,
      text: generateMessageBody(parsed),
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Email sent" }),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid parameters provided.",
          details: treeifyError(error),
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown",
      }),
    };
  }
};
