// AI task 설정 — 프롬프트 + 구조화 출력(JSON Schema). claude-opus-4-8 + structured outputs.
// 프런트(src/data/aiProvider.ts)의 4개 task(draft/review/dedup/summarize)와 1:1 대응.

export type AiTaskKey = "draft" | "review" | "dedup" | "summarize" | "recommend";

// 추천 옵션 화이트리스트 (프런트 상수와 일치)
const REGIONS = ["국내", "북미", "유럽", "중국", "일반"];
const BRANDS = ["현대", "기아", "제네시스"];
const SEGMENTS = ["경차/소형", "준중형", "중형", "대형/플래그십", "SUV/RV", "EV 전용", "상용/PBV"];
const SOP_OPTIONS = ["'26 4Q", "'27 1Q", "'27 2Q", "'27 4Q", "'28 MY", "'29 MY", "미정"];
const BIZ_MODELS = ["기본 탑재", "유상 옵션", "구독 (Subscription)", "FoD (Feature on Demand)"];
const RELATED_DEPTS = ["Product", "System", "SW", "Release", "Operation", "AVP 개발", "MI", "기획", "품질", "구매", "Safety/Security"];

interface TaskConfig {
  system: string;
  user: (body: Record<string, any>) => string;
  schema: Record<string, unknown>;
}

const strField = { type: "string" } as const;

export const AI_TASKS: Record<AiTaskKey, TaskConfig> = {
  // 제안서 초안 자동 보강
  draft: {
    system:
      "너는 자동차 OEM의 Feature 기획 전문가다. 제안서 초안을 구체적이고 현실적으로 작성한다. " +
      "과장 없이 검증 가능한 표현을 쓰고, 각 항목은 한국어로 2~4개의 '- ' 불릿으로 작성한다.",
    user: (b) =>
      `다음 자동차 Feature 제안의 초안을 작성하라.\n` +
      `제안명: ${b.name ?? ""}\n아이디어/고객니즈: ${b.idea ?? ""}\n근거 자료 유형: ${b.needsSource ?? "품질대외지수"}\n` +
      `각 항목(고객 니즈/검토 배경/개발 협의/기대효과/기술 컨셉/유즈케이스/경쟁사 동향)을 자동차 Feature 거버넌스 맥락에 맞게 작성하라. ` +
      `기대효과에는 가능하면 정량 표현(%, 금액, 건수)을 포함하라.`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["customerNeeds", "reviewBackground", "devAgreement", "expectedValue", "techConcept", "useCase", "competitorTrend"],
      properties: {
        customerNeeds: strField,
        reviewBackground: strField,
        devAgreement: strField,
        expectedValue: strField,
        techConcept: strField,
        useCase: strField,
        competitorTrend: strField,
      },
    },
  },

  // 완성도 검토
  review: {
    system:
      "너는 자동차 OEM Feature Intake 심의 위원이다. 제안서의 완성도를 평가한다. " +
      "필수 항목: name, customerNeeds, applyScope. 권장 항목: techConcept, expectedValue, useCase, relatedDepts, reviewBackground. " +
      "보강 제안의 field 는 반드시 제안서의 실제 필드 키(name/customerNeeds/applyScope/techConcept/expectedValue/useCase/relatedDepts/reviewBackground/devAgreement/competitorTrend)만 사용한다.",
    user: (b) =>
      `다음 제안서(JSON)를 검토하라. 완성도 점수(0~100 정수), 등급(상/중/하), 한 줄 평(oneLine), 강점(strengths), 보강 제안(suggestions)을 한국어로 제시하라.\n` +
      `제안서:\n${JSON.stringify(b.request ?? {}, null, 2)}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["score", "level", "oneLine", "strengths", "suggestions"],
      properties: {
        score: { type: "integer" },
        level: { type: "string", enum: ["상", "중", "하"] },
        oneLine: strField,
        strengths: { type: "array", items: strField },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["field", "label", "advice", "severity"],
            properties: {
              field: strField,
              label: strField,
              advice: strField,
              severity: { type: "string", enum: ["필수", "권장"] },
            },
          },
        },
      },
    },
  },

  // 중복 Feature 탐지
  dedup: {
    system:
      "너는 자동차 Feature 포트폴리오 관리자다. 신규 제안이 기존 항목과 중복/유사한지 의미 기반으로 판정한다. " +
      "candidates 는 반드시 제공된 기존 목록(existing)의 항목만 사용하고 id/name/kind 를 그대로 옮긴다. similarity 는 0~1 사이.",
    user: (b) =>
      `신규 제안과 기존 항목 목록을 비교해 중복 여부를 판정하라.\n` +
      `신규 제안명: ${b.name ?? ""}\n신규 아이디어: ${b.idea ?? ""}\n` +
      `기존 항목 목록(JSON):\n${JSON.stringify(b.existing ?? [])}\n` +
      `verdict: 명확 중복 LIKELY_DUPLICATE, 검토권장 REVIEW_RECOMMENDED, 없음 NO_DUPLICATE.`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "candidates"],
      properties: {
        verdict: { type: "string", enum: ["NO_DUPLICATE", "REVIEW_RECOMMENDED", "LIKELY_DUPLICATE"] },
        candidates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "name", "kind", "similarity", "reason"],
            properties: { id: strField, name: strField, kind: strField, similarity: { type: "number" }, reason: strField },
          },
        },
      },
    },
  },

  // 운영안·유관부서 자동 추천 (Step 2/3)
  recommend: {
    system:
      "너는 자동차 OEM Feature 운영 기획 전문가다. 제안 맥락을 보고 운영안과 유관부서를 추천한다. " +
      "반드시 허용된 값만 사용한다. 권역=[국내,북미,유럽,중국,일반], 브랜드=[현대,기아,제네시스]. " +
      "현실적이고 보수적으로 권한다(과도한 전(全)권역/전(全)부서 지정 지양).",
    user: (b) =>
      `다음 제안 맥락을 보고 운영안을 추천하라.\n` +
      `제안명: ${b.name ?? ""}\n아이디어: ${b.idea ?? ""}\n고객 니즈: ${b.customerNeeds ?? ""}\n기술 컨셉: ${b.techConcept ?? ""}\n유즈케이스: ${b.useCase ?? ""}\n` +
      `applyScope(권역→브랜드[]), applySegments(차급), targetSOP(양산 시기), businessModel(과금), volumeEstimate(연간 대수, 정수), ` +
      `desiredVehicle(희망 차종), relatedDepts(유관 부서), regionScopeNote(권역 협의 요약), rationale(추천 근거)를 한국어로 제시하라.`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["regionScopeNote", "applyScope", "applySegments", "targetSOP", "businessModel", "volumeEstimate", "desiredVehicle", "relatedDepts", "rationale"],
      properties: {
        regionScopeNote: strField,
        applyScope: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(REGIONS.map((r) => [r, { type: "array", items: { type: "string", enum: BRANDS } }])),
        },
        applySegments: { type: "array", items: { type: "string", enum: SEGMENTS } },
        targetSOP: { type: "string", enum: SOP_OPTIONS },
        businessModel: { type: "string", enum: BIZ_MODELS },
        volumeEstimate: { type: "integer" },
        desiredVehicle: strField,
        relatedDepts: { type: "array", items: { type: "string", enum: RELATED_DEPTS } },
        rationale: strField,
      },
    },
  },

  // Intake용 요약
  summarize: {
    system: "너는 자동차 Feature Intake 심의 보드용 요약을 작성한다. 핵심만, 한국어로 간결하게.",
    user: (b) =>
      `다음 제안서를 Intake 심의 보드용으로 1문장 요약(summary) + 핵심 불릿 4~5개(bullets)로 요약하라.\n` +
      `${JSON.stringify(b.request ?? {}, null, 2)}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "bullets"],
      properties: { summary: strField, bullets: { type: "array", items: strField } },
    },
  },
};
