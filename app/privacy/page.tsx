import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "개인정보처리방침 — 나답" };

export default function Privacy() {
  return (
    <LegalPage title="개인정보처리방침">
      <section>
        <h2>1. 처리하는 정보</h2>
        <ul>
          <li>고른 고민과 답, 직접 쓴 내용</li>
          <li>성별, 생년월일, 태어난 시간 또는 나이대 (입력한 경우)</li>
          <li>MBTI 유형</li>
        </ul>
      </section>
      <section>
        <h2>2. 이용 목적</h2>
        <p>입력한 정보는 이번 상담의 질문과 답을 만드는 데에만 쓰입니다.</p>
      </section>
      <section>
        <h2>3. 저장하지 않습니다</h2>
        <p>
          나답은 상담 내용과 생년월일을 데이터베이스나 서버 로그에 저장하지 않습니다. 화면을 닫거나 처음부터 다시 하면
          내용이 사라집니다.
        </p>
      </section>
      <section>
        <h2>4. AI 서비스 제공</h2>
        <p>
          <strong>답변은 AI가 생성합니다.</strong> 이를 위해 입력한 내용이 AI 서비스 제공사(Google Gemini API, Anthropic
          Claude API)로 전송되어 처리됩니다. 각 제공사의 데이터 정책에 따라 처리되며, 무료 요금제를 쓰는 기간에는 입력
          내용이 제공사의 서비스 개선에 쓰일 수 있습니다.
        </p>
      </section>
      <section>
        <h2>5. 남용 방지</h2>
        <p>과도한 호출을 막기 위해 접속 IP를 짧은 시간(1분) 동안 메모리에서만 셉니다. 따로 저장하지 않습니다.</p>
      </section>
    </LegalPage>
  );
}
