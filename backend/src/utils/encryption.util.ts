import crypto from "crypto";

const encrypt = (plainText: string, secretKey: string, iv: string) => {
  const keyBuffer = Buffer.from(secretKey, "hex");
  const ivBuffer = Buffer.from(iv, "hex");
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, ivBuffer);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decrypt = (encryptedText: string, secretKey: string, iv: string) => {
  const keyBuffer = Buffer.from(secretKey, "hex");
  const ivBuffer = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export { encrypt, decrypt };
