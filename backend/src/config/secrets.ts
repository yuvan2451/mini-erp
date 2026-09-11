import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

let cachedPassword: string | null = null;

export async function getDatabasePassword(): Promise<string> {
  if (cachedPassword !== null) {
    return cachedPassword;
  }

  const secretName = process.env.AWS_SECRET_NAME;

  if (!secretName) {
    throw new Error("AWS_SECRET_NAME is not configured");
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "eu-north-1",
  });

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    })
  );

  if (!response.SecretString) {
    throw new Error("Database secret does not contain SecretString");
  }

  const secret = JSON.parse(response.SecretString);

  if (!secret.DB_PASSWORD) {
    throw new Error("Database secret does not contain DB_PASSWORD");
  }

  const password: string = secret.DB_PASSWORD;

  cachedPassword = password;

  return password;
}