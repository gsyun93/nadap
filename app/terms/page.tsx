import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "이용약관 — 나답" };

export default function Terms() {
  return (
    <LegalPage title="이용약관">
      <section>
        <h2>1. 서비스 내용</h2>
        <p>
          나답은 사용자가 고른 고민과 답, 성향(MBTI), 생년월일을 바탕으로 맞춤 질문과 정리된 답을 보여주는 상담형 웹
          서비스입니다.
        </p>
      </section>
      <section>
        <h2>2. AI 생성 콘텐츠 고지</h2>
        <p>
          <strong>나답의 질문과 답변은 AI가 생성합니다.</strong> 생성된 내용은 사실과 다르거나 사용자 상황에 맞지 않을 수
          있으며, 전문적인 의료·법률·재무 상담을 대신하지 않습니다.
        </p>
      </section>
      <section>
        <h2>3. 사주 풀이</h2>
        <p>사주 정보는 성향을 이해하기 위한 참고용이며, 운명이나 미래를 단정하지 않습니다.</p>
      </section>
      <section>
        <h2>4. 이용자의 책임</h2>
        <p>서비스에서 받은 내용을 바탕으로 한 결정과 행동의 책임은 이용자 본인에게 있습니다.</p>
      </section>
      <section>
        <h2>5. 서비스 변경·중단</h2>
        <p>서비스는 사전 안내 없이 변경되거나 중단될 수 있습니다.</p>
      </section>
    </LegalPage>
  );
}
