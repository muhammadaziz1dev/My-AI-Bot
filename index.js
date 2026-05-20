import TelegramBot from "node-telegram-bot-api";
import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// Bot va Groq sozlash
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Resume o'qish
const resume = fs.readFileSync("resume.txt", "utf-8");

// System prompt
const systemPrompt = `
Sen — Muhammadaziz Ma'mirjonov ning shaxsiy AI assistantisan.
Faqat quyidagi resume asosida javob ber.
O'zbek tilida, samimiy va professional gapir.
Qisqa va aniq javob ber.
Agar savol resume bilan bog'liq bo'lmasa: 
"Bu haqda ma'lumotim yo'q, to'g'ridan Muhammadaziz bilan bog'laning: @mamirjonov_official" de.

RESUME:
${resume}
`;

// Har user uchun suhbat tarixi
const userHistories = {};

// /start komandasi
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `Salom! 👋 Men Muhammadaziz ning AI assistantiman.\n\nSavol bering — javob beraman! 🤖`
  );
});

// Xabar kelganda
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  // /start ni o'tkazib yubor
  if (userText.startsWith("/")) return;

  // Tarix boshlash
  if (!userHistories[chatId]) {
    userHistories[chatId] = [
      { role: "system", content: systemPrompt }
    ];
  }

  // User xabarini tarixga qo'sh
  userHistories[chatId].push({
    role: "user",
    content: userText,
  });

  // "Yozmoqda..." ko'rsatish
  await bot.sendChatAction(chatId, "typing");

  try {
    // Groq ga so'rov
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: userHistories[chatId],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiReply = response.choices[0].message.content;

    // AI javobini tarixga qo'sh
    userHistories[chatId].push({
      role: "assistant",
      content: aiReply,
    });

    // Tarixni 20 ta bilan chekla
    if (userHistories[chatId].length > 22) {
      const systemMsg = userHistories[chatId][0];
      userHistories[chatId] = [
        systemMsg,
        ...userHistories[chatId].slice(-20)
      ];
    }

    // Javobni yubor
    await bot.sendMessage(chatId, aiReply);

  } catch (error) {
    console.error("Xato:", error.message);
    await bot.sendMessage(
      chatId,
      "Texnik muammo yuz berdi. Keyinroq urinib ko'ring. 🙏"
    );
  }
});

console.log("✅ Bot ishga tushdi!");


// Render uchun mini server
import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot ishlayapti!");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server ishga tushdi!");
});