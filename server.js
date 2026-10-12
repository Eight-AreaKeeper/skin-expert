// 皮肤专家：静态页面 + /api/analyze 图片分析接口
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MOCK = process.env.MOCK === "1";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const client = MOCK ? null : new Anthropic();

const SYSTEM_PROMPT = `你是一位经验丰富的皮肤护理顾问。用户会上传一张用手机相机拍摄的皮肤照片（通常是面部，也可能是身体其他部位）。
请仔细观察照片，用简体中文给出客观、具体、可执行的分析：
- 判断肤质（干性、油性、混合性、中性、敏感性），并说明依据。
- 找出可见的皮肤问题（如痘痘/粉刺、毛孔粗大、出油、干燥脱屑、泛红、色斑/色沉、痘印、细纹、黑眼圈、肤色不均等），标明部位和严重程度。
- 给出日常养护建议，包括清洁、保湿、防晒、作息饮食，以及可以关注的成分（如烟酰胺、水杨酸、神经酰胺），不要推荐具体品牌。
- 如果看到可能需要就医的情况（如疑似感染、异常痣、严重炎症或大面积皮疹），在 see_doctor 中明确建议就诊皮肤科。
- 如果照片模糊、过暗、过曝或者没有拍到皮肤，把 image_ok 设为 false，并在 image_feedback 里告诉用户怎样重拍，其余字段可以给出空数组或简短说明。
你提供的是护肤参考，不是医疗诊断，不要给出处方药建议。`;

const SEVERITY = ["轻微", "中等", "明显"];

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "image_ok", "image_feedback", "skin_type", "skin_type_reason",
    "overall_score", "summary", "issues", "routine", "lifestyle_tips", "see_doctor",
  ],
  properties: {
    image_ok: { type: "boolean", description: "照片是否清晰可用于分析" },
    image_feedback: { type: "string", description: "对照片质量的说明，不可用时给出重拍建议" },
    skin_type: { type: "string", description: "肤质，例如：混合性偏油" },
    skin_type_reason: { type: "string" },
    overall_score: { type: "integer", description: "皮肤整体状态评分，0 到 100" },
    summary: { type: "string", description: "一两句话的总体评价" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "area", "severity", "description", "advice"],
        properties: {
          name: { type: "string" },
          area: { type: "string", description: "出现部位，例如：T 区、两颊" },
          severity: { type: "string", enum: SEVERITY },
          description: { type: "string" },
          advice: { type: "string" },
        },
      },
    },
    routine: {
      type: "object",
      additionalProperties: false,
      required: ["morning", "evening", "weekly"],
      properties: {
        morning: { type: "array", items: { type: "string" } },
        evening: { type: "array", items: { type: "string" } },
        weekly: { type: "array", items: { type: "string" } },
      },
    },
    lifestyle_tips: { type: "array", items: { type: "string" } },
    see_doctor: {
      type: "object",
      additionalProperties: false,
      required: ["recommended", "reason"],
      properties: {
        recommended: { type: "boolean" },
        reason: { type: "string" },
      },
    },
  },
};

const MOCK_RESULT = {
  image_ok: true,
  image_feedback: "照片光线均匀、对焦清晰。（这是演示数据）",
  skin_type: "混合性偏油",
  skin_type_reason: "T 区有明显反光，两颊较为细腻，没有明显出油。",
  overall_score: 72,
  summary: "整体状态不错，主要问题集中在 T 区出油和鼻翼毛孔，两颊有轻微泛红。",
  issues: [
    { name: "出油", area: "额头、鼻子", severity: "中等", description: "T 区反光明显，油脂分泌旺盛。", advice: "早晚使用温和氨基酸洁面，避免过度清洁。" },
    { name: "毛孔粗大", area: "鼻翼", severity: "中等", description: "鼻翼两侧毛孔可见，伴少量黑头。", advice: "每周 1 到 2 次使用含水杨酸的产品，注意保湿。" },
    { name: "轻微泛红", area: "两颊", severity: "轻微", description: "两颊有淡淡的红血丝。", advice: "减少去角质频率，选择含神经酰胺的修护保湿产品。" },
  ],
  routine: {
    morning: ["温和洁面", "保湿乳液", "SPF30 以上防晒"],
    evening: ["卸妆 / 洁面", "含烟酰胺精华（控油、提亮）", "保湿霜"],
    weekly: ["T 区清洁面膜 1 次", "补水面膜 1 到 2 次"],
  },
  lifestyle_tips: ["保证 7 小时以上睡眠", "减少高糖高油饮食", "枕巾每周更换"],
  see_doctor: { recommended: false, reason: "目前未见需要就医的情况。" },
};

async function analyze(mediaType, data) {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return MOCK_RESULT;
  }
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: RESULT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: "请分析这张皮肤照片。" },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new UserError("这张照片暂时无法分析，请换一张只包含皮肤的照片再试。");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("模型输出被截断");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

class UserError extends Error {}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new UserError("图片太大，请重新拍摄。");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function handleAnalyze(req, res) {
  try {
    const body = JSON.parse(await readBody(req));
    const match = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(body.image || "");
    if (!match || !ALLOWED_MEDIA.has(match[1])) {
      throw new UserError("没有收到有效的图片。");
    }
    const result = await analyze(match[1], match[2]);
    sendJson(res, 200, { ok: true, result });
  } catch (err) {
    if (err instanceof UserError) return sendJson(res, 400, { ok: false, error: err.message });
    if (err instanceof Anthropic.RateLimitError) {
      return sendJson(res, 429, { ok: false, error: "当前使用人数较多，请稍后再试。" });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("API key 无效或未设置 ANTHROPIC_API_KEY");
      return sendJson(res, 500, { ok: false, error: "服务暂未配置好，请联系管理员。" });
    }
    console.error(err);
    sendJson(res, 500, { ok: false, error: "分析失败，请稍后重试。" });
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/manifest+json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const filePath = path.join(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { ok: false });
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

http
  .createServer((req, res) => {
    // App 的网页版和本地调试会跨域调用接口
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method === "POST" && req.url === "/api/analyze") return handleAnalyze(req, res);
    if (req.method === "GET") return serveStatic(req, res);
    res.writeHead(405);
    res.end();
  })
  .listen(PORT, () => {
    console.log(`皮肤专家已启动：http://localhost:${PORT}${MOCK ? "（演示模式，不调用 AI）" : `（模型 ${MODEL}）`}`);
  });
