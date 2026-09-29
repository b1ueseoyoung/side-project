import "server-only";

import nodemailer from "nodemailer";

import { requireEnv } from "./env";

/**
 * Sends the login link over SMTP (SMTP_URL, e.g. a Gmail app password:
 * smtps://you%40gmail.com:app-password@smtp.gmail.com:465).
 */
export async function sendLoginLink(to: string, url: string) {
  const transport = nodemailer.createTransport(requireEnv("SMTP_URL"));
  await transport.sendMail({
    from: requireEnv("SMTP_FROM"),
    to,
    subject: "기획 메모 진단 로그인 링크",
    text: `아래 링크를 누르면 로그인돼요. 10분 동안 한 번만 쓸 수 있어요.\n\n${url}\n\n직접 요청하지 않았다면 이 메일은 무시하세요.`,
  });
}
