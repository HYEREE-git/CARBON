const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, LevelFormat, PageBreak, Footer, PageNumber,
} = require('docx');

const FIG = (f) => path.join(__dirname, 'figures', f);
const FONT = 'Malgun Gothic';
const TW = 9026; // A4 text width with 1in margins (DXA)

// ---------- helpers ----------
function runs(text, base = {}) {
  // **bold** segments
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) =>
    p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, ...base }) : new TextRun({ text: p, ...base })
  );
}
const P = (text, opt = {}) =>
  new Paragraph({ children: runs(text, opt.run || {}), spacing: { after: 140, line: 360 }, alignment: opt.align || AlignmentType.JUSTIFIED, ...(opt.p || {}) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], spacing: { before: 360, after: 180 } });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)], spacing: { before: 240, after: 120 } });
const Bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: runs(t), spacing: { after: 80, line: 340 } });
const Num = (t) => new Paragraph({ numbering: { reference: 'num', level: 0 }, children: runs(t), spacing: { after: 80, line: 340 } });
const Caption = (t) => new Paragraph({ children: runs(t, { size: 19 }), spacing: { before: 60, after: 220, line: 300 }, alignment: AlignmentType.LEFT });
const Note = (t) => new Paragraph({ children: runs(t, { size: 17, color: '4A5568' }), spacing: { after: 220, line: 280 } });
const Quote = (t) =>
  new Paragraph({ children: runs(t, { italics: false }), indent: { left: 567, right: 567 }, spacing: { after: 160, line: 340 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'B34A17', space: 8 } } });

function Img(file, wPx, hPx) {
  const maxW = 600; // px at 96dpi ~ 6.25in
  const w = Math.min(maxW, wPx);
  const h = Math.round((hPx * w) / wPx);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(FIG(file)), transformation: { width: w, height: h } })] });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFC6D0' };
const borders = { top: border, bottom: border, left: border, right: border };
function Tbl(header, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, head, shade) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, borders,
      shading: head ? { fill: 'E8ECF2', type: ShadingType.CLEAR, color: 'auto' } : shade ? { fill: 'F7F8FA', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: runs(String(t), { size: 18, bold: head }), spacing: { after: 0, line: 280 } })],
    });
  return new Table({
    width: { size: sum, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, i, false, ri % 2 === 1)) }))],
  });
}

// ---------- content ----------
const C = [];

// Title block
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'CBAM 관련 산업의 생산·소비 배출과 탄소무역 구조:', bold: true, size: 32 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: '한국·대만의 국가 전체, 관련 산업, 세계 및 EU 비교', bold: true, size: 30 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'Production- and Consumption-Based Emissions in CBAM-Related Industries: Korea and Taiwan across National, Sectoral, Global and EU Perspectives', italics: true, size: 22 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Hyeree Kimᵃ* and Yeonbae Kimᵃ', size: 22 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'ᵃ 서울대학교 협동과정 기술경영·경제·정책전공 (TEMEP, Seoul National University), Seoul, Republic of Korea', size: 18 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: '* 교신저자 (Corresponding author). Email: fortuna0@snu.ac.kr; 공저자 Email: kimy1234@snu.ac.kr', size: 18 })] }));

C.push(H2('Disclosure statement'));
C.push(P('No potential conflict of interest was reported by the author(s).'));
C.push(H2('Funding'));
C.push(P('This research received no specific grant from any funding agency in the public, commercial, or not-for-profit sectors.'));
C.push(H2('Data availability statement'));
C.push(P('본 연구는 OECD Greenhouse Gas Footprints 2025 에디션(ICIO 2025 기반, 1995–2022)과 양자 교역 내재배출 자료(DSD_ICIO_GHG_TRADE_2025), Penn World Table 11.0 및 World Bank WDI를 사용한다. 파생 자료와 재현 코드는 게재 확정 시 공개 저장소에 등록하고 영구 식별자를 발급받을 예정이며, 심사 단계에서는 익명 저장소를 통해 제공한다. [저자 확인: 재현 저장소를 본 원고의 자료판(2025)과 변수 정의에 맞게 갱신]'));

C.push(new Paragraph({ children: [new PageBreak()] }));

// Abstract
C.push(H1('초록'));
C.push(P('EU 탄소국경조정제도(CBAM)는 수입품이 생산되는 과정에서 발생한 내재배출을 규율한다. 그러나 탄소집약 제품은 한 나라에서 생산되어 다른 시장의 수요를 충족하므로, 같은 배출을 두고 "어디서 만들었는가"와 "누구의 수요를 위해 만들었는가"라는 두 질문이 성립한다. 본 연구는 생산기반 배출(PBE), 소비기반 배출(CBE), 그 차이인 순내재배출 무역량(NET = PBE − CBE)을 함께 제시하여, 고소득·제조업 중심·비EU 경제인 한국과 대만의 탄소무역 관계가 국가 전체와 CBAM 관련 산업, 세계 전체와 EU와의 교역에서 어떻게 달라지는지 분석한다. OECD 온실가스 발자국 자료를 사용하였다. 2019년 한국의 국가 전체 NET은 −50.3 MtCO₂e, 대만은 +104.6 MtCO₂e로 방향이 반대였으나, CBAM 관련 4개 산업의 NET은 각각 +22.1과 +21.7로 모두 양(+)이었다. 교역상대를 EU27로 좁히면 한국의 국가 전체 NET도 양(+)으로 바뀌었다. 두 나라 합산 관련 산업의 세계 기준 NET은 2019년 +43.7에서 2022년 +25.8로 줄었으나 EU27과의 NET은 +6.5에서 +13.9로 늘었다. 다만 같은 기간 미국과의 NET도 증가하여, EU와의 변화를 CBAM의 효과로 해석할 근거는 없다. 이 결과는 국가 전체의 생산·소비 배출 관계가 관련 산업의 위치를 대표하지 못하고, 세계 전체의 교역 관계가 EU와의 관계를 대표하지 못함을 보여준다. 본 연구는 CBAM 납부액이나 국가 간 책임 분담액을 추정하지 않는다. 대신 탄소국경조정을 논의할 때 생산 배출, 소비기반 회계, 대상 시장을 구분해 함께 제시해야 한다는 해석의 출발점을 제공한다.'));
C.push(P('**Keywords:** Carbon Border Adjustment Mechanism (CBAM); production-based emissions; consumption-based emissions; embodied emissions in trade; Korea; Taiwan'));

C.push(H2('주요 정책 시사점 (Key policy insights)'));
C.push(Num('국가 전체의 탄소 순수출·순수입 분류는 CBAM 관련 산업의 위치를 대표하지 못한다. 한국은 국가 전체로는 탄소 순수입국이지만 관련 산업에서는 순수출이었다.'));
C.push(Num('세계 전체 교역에서의 변화는 EU 시장과의 변화를 대표하지 못한다. EU 대응 대상은 EU와의 교역 지표로 고르고, 그 안에서 실제 CBAM 적용 품목과 시설의 배출 자료로 우선순위를 정해야 한다.'));
C.push(Num('탄소국경조정을 평가할 때 생산지의 배출과 수입시장에 연결된 교역을 함께 제시할 필요가 있다. 본 연구의 NET은 CBAM 부담액이나 책임 분담액이 아니다.'));

C.push(new Paragraph({ children: [new PageBreak()] }));

// 1. Introduction
C.push(H1('1. 서론'));
C.push(P('EU 탄소국경조정제도(CBAM)는 2026년 확정기에 들어갔다. CBAM은 철강, 알루미늄, 시멘트, 비료, 수소, 전력 등 적용 품목이 EU로 수입될 때 그 생산 과정에서 발생한 내재배출에 탄소가격을 부과하며, 의무는 품목과 시설 단위의 배출 자료를 기초로 산정된다(European Union, 2023, 2025). 영국도 2027년 자체 CBAM 시행을 예고하는 등 탄소국경조정은 여러 관할권으로 확산되고 있다(HM Treasury & HM Revenue & Customs, 2025).'));
C.push(P('탄소집약 제품은 한 나라에서 생산되어 다른 시장의 수요를 충족한다. 예컨대 한국에서 생산해 EU로 수출한 철강의 배출은 한국의 생산기반 배출(PBE)에 계상되지만, 그 철강이 EU의 최종수요를 충족한다면 소비기반 회계(CBE)에서는 EU의 수요와도 연결된다. 같은 배출을 두고 "어디서 만들었는가"와 "누구의 수요를 위해 만들었는가"라는 두 질문이 성립하는 것이다. 생산기반과 소비기반 배출의 차이는 국제 교역을 통해 탄소 책임이 생산지와 소비지 사이에 나뉜다는 점을 보여 왔으나(Peters & Hertwich, 2008; Davis & Caldeira, 2010), 이러한 논의는 주로 국가 전체 단위에서 이루어졌다.'));
C.push(P('탄소국경조정과 관련해 이 구분이 중요한 이유는 국가 전체의 설명이 규제 관련 산업이나 특정 규제 시장에서도 그대로 성립한다는 보장이 없기 때문이다. 한 나라가 국가 전체로는 탄소 순수입국이더라도 철강·화학 같은 관련 산업에서는 순수출일 수 있고, 세계 전체를 상대로 한 관계와 EU를 상대로 한 관계가 다를 수도 있다. 이 경우 국가 전체의 탄소 순수출입 분류로 관련 산업이나 EU 시장을 설명하면 생산과 소비의 연결 관계를 놓치게 된다.'));
C.push(P('이러한 차이는 당연해 보일 수 있다. 그러나 탄소무역 논의에서 한 나라의 위치는 여전히 국가 전체의 순수출·순수입으로 요약되는 경우가 많다. 예컨대 OECD의 온실가스 발자국 국가 자료는 한국을 수입에 담긴 배출이 수출에 담긴 배출보다 많은 나라로 소개하며 [저자 확인: 출처와 표현], 국내 연구도 주로 국가 전체의 생산기반·소비기반 배출을 비교해 왔고 그 부호는 자료에 따라 다르게 보고된다(조홍종·구효정, 2022). 이 요약이 관련 산업과 규제 시장에서도 성립하는지는 따로 확인되지 않았다. 또한 차이는 규모에 그치지 않는다. 4장에서 보듯 한국은 국가 전체로는 순수입이지만 관련 산업에서는 순수출이어서 부호 자체가 바뀌고, 48개국 중 22개국에서 국가 전체와 관련 산업의 관계가 방향이나 규모에서 어긋난다.'));
C.push(P('본 연구는 PBE와 CBE를 함께 제시하고 그 차이인 NET을 분석하여, 한국과 대만의 국가 전체 탄소무역 위치가 CBAM 관련 산업의 수출입에 담긴 배출에서도 유지되는지 확인한다. 이어 세계 전체와 EU와의 교역을 비교하여, 이러한 관계를 특정 규제 시장에 그대로 적용할 수 있는지 검토한다. 한국과 대만은 48개국 분석 패널에서 EU 밖에 있고, 고소득이며, 제조업 비중이 높고, 분석 기간 동안 생산기반 배출이 증가한 두 경제다(3.5절). 두 나라는 같은 유형으로 묶이지만 국가 전체의 탄소무역 위치는 서로 반대여서 비교할 가치가 있다. 이 연구가 두 나라를 가장 취약한 경제로 보고 선정한 것은 아니다.'));
C.push(P('본 연구의 질문은 다음 두 가지다.'));
C.push(Quote('**RQ1.** 한국과 대만에서 국가 전체의 PBE·CBE·NET 관계는 CBAM 관련 산업에서도 유지되는가?'));
C.push(Quote('**RQ2.** 두 나라의 세계 전체 탄소무역 관계는 EU와의 교역에서도 같은 모습과 추세를 보이는가?'));
C.push(P('본 연구는 CBAM 납부액이나 EU 최종소비에 따른 책임액을 추정하지 않으며, 규제에 따른 생산 이전(탄소누출)도 관찰하지 않는다. EU와 관련된 수치는 EU 소비의 책임액이 아니라 **EU와의 교역에 담긴 배출**을 나타낸다. EU로 직접 수출된 제품이 모두 EU에서 최종소비되는 것은 아니며, 제3국을 거쳐 EU에 도달하는 배출도 있기 때문이다. 이러한 범위 안에서 본 연구가 보이려는 것은, 탄소국경조정 관련 산업의 배출을 생산국의 국가 총량만으로 해석하기 어렵다는 점이다.'));
C.push(P('논문의 구성은 다음과 같다. 2장은 생산·소비 회계와 CBAM 관련 선행연구를 정리한다. 3장은 자료, 지표, 관련 산업의 대응, 사례 선정을 설명한다. 4장은 48개국의 맥락을 간략히 제시한 뒤 RQ1과 RQ2의 결과를 보고한다. 5장은 결과의 의미와 정책적 함의, 한계를 논의하고 6장에서 결론을 맺는다.'));

// 2. Literature
C.push(H1('2. 선행연구와 개념'));
C.push(H2('2.1 생산기반·소비기반 회계'));
C.push(P('생산기반 배출(PBE)은 한 나라의 영토 안에서 발생한 배출로, 국가 인벤토리와 감축 목표의 기준이 된다. 소비기반 배출(CBE)은 한 나라의 최종수요를 충족하기 위해 전 세계 공급망에서 발생한 배출이다. 두 회계의 차이는 선진국의 영토 내 감축이 수입품에 담긴 배출의 증가와 함께 나타날 수 있음을 보여 왔다(Peters & Hertwich, 2008; Wiedmann, 2009; Davis & Caldeira, 2010). 두 기준의 격차가 소득 수준보다 수입 의존도와 제조업 비중 같은 경제구조에 좌우된다는 연구도 있다(Franzen & Mader, 2018). 생산자와 소비자의 책임을 어떻게 나눌지에 대해서는 공동 책임(Lenzen et al., 2007)과 수출국의 기술 차이를 조정한 회계(Kander et al., 2015) 등이 제안되었다. 최근에는 OECD 국가간투입산출표(ICIO)를 이용해 국가별 순배출 이전을 추적한 연구도 이어지고 있다(Darwili & Schröder, 2025).'));
C.push(P('이들 연구는 대부분 국가 전체를 분석 단위로 삼았다. 부문 집계 수준이 내재배출 추정에 영향을 준다는 점(Su et al., 2010)과, 국가의 순수지가 교역의 부문 구성에 좌우된다는 점(Cezar & Polge, 2020)은 지적되었으나, 규제 대상 산업에서 국가 전체와 다른 생산·소비 관계가 나타나는지는 체계적으로 다뤄지지 않았다.'));
C.push(H2('2.2 CBAM 연구'));
C.push(P('CBAM 연구는 탄소누출 완화와 역내 경쟁력이라는 제도적 목적(Mehling et al., 2019; Ambec et al., 2024; Zhong & Pei, 2024), EU 역내의 분배 효과(Bellora & Fontagné, 2023; Amendola, 2025), 역외 교역상대국에 대한 영향(Perdana & Vielle, 2022; Beaufils et al., 2023; Magacho et al., 2024; Dechezleprêtre et al., 2025)으로 나뉜다. 국가별 노출지수는 EU향 수출과 탄소집약도를 결합해 예상 부담을 근사한다(World Bank, 2023). 이러한 접근은 품목 단위로 부과되는 CBAM의 비용을 추정하는 데 적합하다. 그러나 그 배출이 생산국과 소비시장 사이에서 어떻게 나뉘는지, 곧 생산·소비 회계의 관점에서 CBAM 관련 산업을 해석하는 작업은 상대적으로 적었다. CBAM의 책임 배분을 규범적으로 논의한 연구도 있으나(Dobson, 2022), 이를 산업과 교역상대 단위의 수치와 연결한 연구는 본 연구가 검토한 범위에서 드물다.'));
C.push(H2('2.3 본 연구의 위치'));
C.push(P('본 연구는 두 흐름을 잇는다. 생산·소비 회계의 지표(PBE·CBE·NET)를 CBAM 관련 산업과 EU와의 교역에 적용하여, 국가 전체의 설명이 관련 산업과 규제 시장에서도 성립하는지 확인한다. 이는 CBAM 부담을 추정하는 노출지수를 대체하는 것이 아니라, 같은 배출을 생산과 소비의 관점에서 해석하는 보완적 작업이다.'));

// 3. Data & Methods
C.push(H1('3. 자료와 방법'));
C.push(Img('fig1.png', 3200, 1024));
C.push(Caption('**그림 1.** 분석 틀. 같은 회계 지표(NET = PBE − CBE)를 국가 전체, CBAM 관련 산업, EU와의 교역이라는 세 단위에서 비교한다.'));
C.push(H2('3.1 자료'));
C.push(P('OECD Greenhouse Gas Footprints 2025 에디션(ICIO 2025 기반, 1995–2022)을 사용하였다. 국가 단위 PBE와 CBE는 이 자료에서, 산업·교역상대 단위의 내재배출은 양자 교역 내재배출 자료(DSD_ICIO_GHG_TRADE_2025)에서 산출하였다. 주 분석 기간은 1995–2019년이며, 팬데믹과 에너지 위기 시기를 포함한 2022년은 확장 분석으로 제시한다. 분석 패널은 1995–2019년 자료가 모두 있는 48개국이며, 중계무역 비중이 큰 홍콩과 싱가포르는 제외하였다. [저자 확인: ICIO 전체 경제 수와 48개국으로 줄어든 제외 사유를 부록에 명시]'));
C.push(H2('3.2 PBE·CBE·NET'));
C.push(P('국가 i의 소비기반 배출은 생산기반 배출에서 수출에 담긴 배출(EEX)을 빼고 수입에 담긴 배출(EEI)을 더한 값이다. 따라서 국가 전체 NET은 다음과 같다.'));
C.push(P('NETᵢ = PBEᵢ − CBEᵢ = EEXᵢ − EEIᵢ', { align: AlignmentType.CENTER, run: { bold: true } }));
C.push(P('NET이 양(+)이면 영토 안에서 발생한 배출이 자국의 최종수요와 연결된 배출보다 많은 탄소 순수출, 음(−)이면 탄소 순수입을 뜻한다. 규모가 다른 경제를 비교할 때는 NET을 PBE로 나눈 값(NET/PBE)을 함께 제시한다.'));
C.push(P('산업 단위 NET은 해당 산업의 수출에 담긴 배출에서 수입에 담긴 배출을 뺀 값이다(NETᵢ,ₛ = EEXᵢ,ₛ − EEIᵢ,ₛ). 이는 **해당 산업의 수출·수입에 담긴 배출의 차이**이며, 그 산업의 최종수요 배출을 따로 계산한 값은 아니다. [저자 확인: 산업별 배출의 귀속 기준(교역 품목 산업 / 배출 발생 산업)과, 전 산업 합계가 국가 전체 NET과 일치하는지 부록에 명시]'));
C.push(P('NET은 두 회계 관점의 차이를 보여주는 지표다. NET이 양(+)이라는 사실이 다른 나라가 CBAM 비용을 대신 부담해야 한다는 근거가 되지는 않으며, PBE와 CBE를 더해 양쪽에 비용을 부과하자는 의미도 아니다.'));
C.push(H2('3.3 CBAM 관련 산업'));
C.push(P('CBAM의 6개 품목군은 탄소집약도와 교역 노출이 높아 탄소누출 위험이 큰 산업으로 지정되었다. ICIO 자료의 산업 분류는 품목보다 넓으므로, 6개 품목군을 포괄하는 최소 산업 집합인 4개 산업을 "CBAM 관련 산업"으로 정의하였다(표 1). 결과는 실제 적용 품목의 부담액이 아니라 관련 산업의 교역 구조에 대한 분석이며, 범위가 넓은 화학 부문의 영향은 화학 제외·기초금속 단독 결과로 함께 점검한다.'));
C.push(Tbl(['CBAM 품목군', 'ICIO 산업', '함께 포함되는 비대상 품목', '대응 정도'],
  [['철강, 알루미늄', 'C24 기초금속', '동·아연 등 비철금속', '높음'],
   ['시멘트', 'C23 비금속광물', '유리, 도자기 등', '중간'],
   ['비료, 수소', 'C20 화학', '석유화학, 플라스틱 등 대부분', '낮음'],
   ['전력', 'D 전력·가스', '가스·증기 공급', '높음']], [2100, 2000, 3226, 1700]));
C.push(Caption('**표 1.** CBAM 품목군과 ICIO 산업의 대응.'));
C.push(H2('3.4 세계 기준과 EU27 기준'));
C.push(P('세계 기준 NET은 모든 교역상대와의 수출입을 합한 값이고, EU27 기준 NET은 EU27 회원국과의 양자 교역만 합한 값이다. EU27 기준에서는 EU향 수출에 담긴 배출(총수출 내재배출)도 함께 제시한다. EU27 기준 수치는 EU와의 교역에 담긴 배출이며 EU 최종소비가 유발한 배출량과 같지 않다. 비교를 위해 미국, 중국, ASEAN 등 주요 교역상대의 값도 함께 보고한다.'));
C.push(H2('3.5 사례 선정'));
C.push(P('한국과 대만은 결과 변수(NET)를 쓰지 않고 네 가지 구조 조건을 차례로 적용하여 선정하였다(표 2). EU 밖에 있어 역내 전환 지원을 받지 않고, 고소득이어서 개도국 우대를 원용하기 어려우며, 제조업 비중이 높고, 분석 기간 동안 생산기반 배출이 증가한 경제다. 소득 기준을 1만 2,535–2만 5,000달러, 제조업 기준을 15–25%로 바꾸어도 선정 결과는 같았다(부록 A9.4). 국가군 비교에서는 두 나라를 합산하고, RQ1과 RQ2의 결과는 나라별 값과 함께 제시한다.'));
C.push(Tbl(['단계', '조건 (2019년 기준)', '남은 국가 수', '제외된 주요 국가'],
  [['0', '1995–2019 자료가 모두 있는 분석 패널', '48', '홍콩, 싱가포르(중계무역)'],
   ['1', 'EU 밖', '20', 'EU 28개국(분석 기간 중 영국 포함)'],
   ['2', '1인당 명목 GDP 2만 달러 이상', '5', '중국, 말레이시아, 태국 등'],
   ['3', '제조업 부가가치 비중 20% 이상', '3', '미국, 브루나이 [확인: 브루나이 제조업 비중 값]'],
   ['4', '1995–2019 생산기반 배출 증가', '2', '일본(배출 감소)']], [800, 3326, 1400, 3500]));
C.push(Caption('**표 2.** 초점 사례 선정 과정. 남은 국가: 2단계 한국·대만·일본·미국·브루나이 → 3단계 한국·대만·일본 → 4단계 한국·대만.'));

// 4. Results
C.push(H1('4. 결과'));
C.push(H2('4.1 맥락: 48개국에서 국가 전체와 관련 산업의 관계'));
C.push(P('2019년 48개국 가운데 22개국에서 국가 전체와 CBAM 관련 산업의 NET이 방향 또는 상대적 규모에서 달랐다(그림 2). 국가 전체는 순수입이나 관련 산업은 순수출인 경우가 6개국(한국, 네덜란드, 벨기에, 오스트리아, 룩셈부르크, 슬로바키아), 둘 다 순수출이나 관련 산업이 국가 전체의 절반에 못 미치는 경우가 5개국(대만, 중국, 불가리아, 말레이시아, 인도네시아), 국가 전체는 순수출이나 관련 산업은 순수입인 경우가 11개국(태국, 베트남, 브라질, 폴란드, 덴마크 등)이었다. 불일치는 한 방향으로만 나타나지 않았다. 국가 전체가 탄소 순수출국이라는 분류를 관련 산업에 그대로 적용할 수 없다는 뜻이다.¹'));
C.push(Img('fig2_census48.png', 3060, 2100));
C.push(Caption('**그림 2.** 48개국의 국가 전체(가로축)와 CBAM 관련 산업(세로축)의 NET/PBE, 2019년. 왼쪽 위 음영은 국가 전체 순수입·관련 산업 순수출 영역. [확인: 점 색의 구분 기준을 범례에 추가]'));
C.push(Note('¹ 국가 전체가 순수출인 17개국 중 11개국, 순수입인 31개국 중 6개국에서 관련 산업의 부호가 달랐다(Fisher 정확검정 p = 0.004). 이 검정은 48개국에서 부호 불일치 빈도의 차이에 관한 것이며, 특정 국가의 CBAM 부담이나 정책 판단을 검증한 결과가 아니다.'));

C.push(H2('4.2 RQ1: 국가 전체의 관계는 관련 산업에서도 유지되는가'));
C.push(P('유지되지 않았다. 2019년 한국의 국가 전체 NET은 −50.3 MtCO₂e로 탄소 순수입, 대만은 +104.6 MtCO₂e로 순수출이었다. 두 나라의 국가 전체 위치는 반대다. 그러나 CBAM 관련 산업의 NET은 한국 +22.1, 대만 +21.7로 둘 다 양(+)이었다(표 3, 그림 3).'));
C.push(Tbl(['구분', '한국', '대만'],
  [['국가 전체 NET (MtCO₂e)', '−50.3 (순수입)', '+104.6 (순수출)'],
   ['CBAM 관련 4개 산업 NET', '+22.1 (순수출)', '+21.7 (순수출)'],
   ['기초금속(C24)만 NET', '+15.7', '+6.8'],
   ['화학(C20)만 NET', '+11.2', '+17.9'],
   ['국가 전체 대비 관련 산업 비중', '— (부호 반대)', '21%'],
   ['국가 전체와 관련 산업의 관계', '부호가 반대', '같은 부호, 국가 전체가 4.8배']], [3626, 2700, 2700]));
C.push(Caption('**표 3.** 한국과 대만의 국가 전체와 CBAM 관련 산업 NET, 2019년, 세계 기준. 산업별 값은 부록 A14.'));
C.push(Img('fig3_kor_twn.png', 3000, 1857));
C.push(Caption('**그림 3.** 한국과 대만의 국가 전체와 CBAM 관련 4개 산업 NET, 2019년.'));
C.push(P('한국에서는 CBAM 비대상 부문의 순수입이 관련 산업의 순수출보다 커서 국가 전체가 순수입으로 나타난다. 이 경우 "한국은 탄소 순수입국"이라는 국가 전체의 설명은 철강·화학에서 생산이 국내 최종수요를 넘어서는 관계를 드러내지 못한다. 대만에서는 전자산업 등 비대상 부문의 순수출이 국가 전체를 끌어올려, 국가 전체 NET이 관련 산업의 4.8배에 이른다. 이 경우 국가 전체의 순수출 규모를 관련 산업의 규모로 읽을 수 없다.'));
C.push(P('두 나라의 관련 산업 NET이 비슷하다는 결과는 범위가 넓은 화학(C20)을 포함할 때 성립한다. 기초금속만 보면 한국이 +15.7, 대만이 +6.8로 한국이 더 크다. 그러나 두 경우 모두 관련 산업이 순수출이라는 판정은 바뀌지 않는다. 생산·소비의 관점에서 정리하면, 두 나라는 국가 전체로는 반대 위치에 있지만 CBAM 관련 산업에서는 모두 생산 배출이 국내 최종수요와 연결된 배출보다 많은 경제다.'));

C.push(H2('4.3 RQ2: 세계 전체의 관계는 EU와의 교역에서도 같은가'));
C.push(P('같지 않았다. 차이는 수준과 추세 두 곳에서 나타났다.'));
C.push(P('**수준.** 교역상대를 EU27로 좁히면 한국의 국가 전체 NET은 +8.9 MtCO₂e로, 세계 기준(−50.3)과 부호가 반대가 된다(2019년; 부록 표 A11.2). 대만은 +10.8이었다. 관련 산업의 EU27 기준 NET은 한국 +4.0, 대만 +2.5였고, 두 나라 합산 +6.5 MtCO₂e는 모두 기초금속에서 나왔다. 세계 기준에서는 화학과 기초금속이 함께 순수출을 이끌었으나 EU27과의 교역에서는 기초금속이 중심이었다. 48개국 전체를 EU27 기준으로 다시 분류하면 국가 전체와 관련 산업이 어긋나는 나라는 22개국에서 29개국으로 늘었다.'));
C.push(P('**추세.** 두 나라 합산 관련 산업의 세계 기준 NET은 2019년 +43.7에서 2022년 +25.8 MtCO₂e로 줄었다. 같은 기간 EU27과의 NET은 +6.5에서 +13.9로, EU향 수출에 담긴 배출은 14.1에서 20.5 MtCO₂e로 늘었다(표 4, 그림 4a). 세계 기준의 감소는 주로 중국과의 교역에서 나타났는데, 중국 상대 NET은 +4.4에서 −21.3으로 바뀌었다(그림 4b).'));
C.push(Tbl(['지표 (한국·대만 합산, 관련 산업)', '1995', '2019', '2022'],
  [['세계 기준 NET', '−48.6', '+43.7', '+25.8'],
   ['EU27 기준 NET', '−6.3', '+6.5', '+13.9'],
   ['  기초금속(C24)만, EU27 기준', '−2.8', '+6.5', '+10.0'],
   ['EU27향 수출에 담긴 배출', '3.6', '14.1', '20.5'],
   ['전체 수출 내재배출 중 EU27 비중', '5.4%', '7.0%', '10.1%'],
   ['EU27+영국 기준 NET', '−6.8', '+6.8', '+14.6']], [4226, 1600, 1600, 1600]));
C.push(Caption('**표 4.** 세계 기준과 EU27 기준 비교, MtCO₂e. 자료: OECD Greenhouse Gas Footprints, DSD_ICIO_GHG_TRADE_2025; 저자 계산.'));
C.push(Img('fig4.png', 3200, 1154));
C.push(Caption('**그림 4.** (a) 한국·대만 합산 CBAM 관련 산업의 세계 기준과 EU27 기준 NET. (b) 교역상대별 NET, 2019년과 2022년(양국 상호 교역 제외). 연도 간격은 등간격으로 표시.'));
C.push(P('다만 EU27과의 NET 증가를 CBAM의 효과로 볼 근거는 없다. 같은 기간 미국과의 NET도 +8.2에서 +17.9로 증가했으며, 2022년은 CBAM 보고 의무(2023년 10월) 이전이고 에너지 위기와 대러 제재가 겹친 해다. 이 결과가 보여주는 것은 세계 전체에서의 변화만으로 특정 규제 시장과의 변화를 설명할 수 없다는 점이다.'));

C.push(H2('4.4 강건성'));
C.push(P('주요 판정은 다음 점검에서 유지되었다(부록 A9, A13). 2022년 종점에서도 국가 전체와 관련 산업의 불일치는 18개국에서 나타났고 한국과 대만의 판정은 같았다. 다만 국가 전체 순수입·관련 산업 순수출 유형의 국가 구성은 바뀌어(오스트리아·벨기에·슬로바키아 이탈, 일본·체코 진입) 이 관계가 고정된 국가 속성이 아님을 보여준다. 독립 자료인 EXIOBASE 3에서도 대만의 관련 산업 순수출과 두 나라 합산의 순수입→순수출 전환(−75.0 → +16.7)이 재현되었다. 한국은 기초금속의 순수출 방향이 재현되었으나 4개 산업 합계는 릴리스에 따라 −1.9에서 +8.2 MtCO₂e로 달라졌다. 한국의 국가 전체 방향 역시 자료와 기준에 따라 순수출로 보고되기도 한다(조홍종·구효정, 2022). 따라서 한국에 대해서는 합계의 크기보다 기초금속의 순수출 방향에 무게를 둔다. 화학을 제외하거나 기초금속만 볼 때도 한국·대만 합산 관련 산업은 순수출이었다(NET/PBE +3.9% → +1.3%, +2.0%).'));

// 5. Discussion
C.push(H1('5. 논의'));
C.push(H2('5.1 국가 전체로는 관련 산업을 설명할 수 없다 (RQ1)'));
C.push(P('한국과 대만은 국가 전체의 탄소무역 위치가 반대지만 CBAM 관련 산업에서는 모두 순수출이다. 국가 전체의 탄소 순수출입 분류는 여러 산업의 관계를 합친 결과이므로, 비대상 산업의 순수입이나 순수출이 관련 산업의 관계를 덮을 수 있다. 48개국에서도 같은 불일치가 22개국에서 나타났다. 따라서 생산·소비 회계를 탄소국경조정 논의에 적용하려면 국가 전체가 아니라 관련 산업의 관계를 따로 제시해야 한다.'));
C.push(H2('5.2 세계 전체로는 EU 시장을 설명할 수 없다 (RQ2)'));
C.push(P('세계 기준에서 한국은 국가 전체로 탄소 순수입국이지만 EU27과의 교역에서는 순수출이다. 관련 산업의 세계 기준 NET이 줄어드는 동안 EU27과의 NET은 늘었고, EU27과의 교역은 기초금속에 집중되어 있었다. 세계 전체의 관계는 여러 교역상대와의 관계를 합친 결과이므로, 한 교역상대와의 큰 변화(이 경우 중국)가 다른 시장과의 변화를 가릴 수 있다. 탄소국경조정은 특정 관할권의 국경에서 작동하므로, 그 관할권과의 교역을 세계 전체와 구분해 제시해야 한다.'));
C.push(H2('5.3 정책적 함의'));
C.push(P('본 연구는 CBAM의 납부액이나 국가 간 책임 분담 비율을 추정하지 않는다. 그러나 한국·대만의 결과는 탄소국경조정 관련 산업의 배출을 생산국의 국가 총량만으로 해석하기 어렵다는 점을 보여준다. 두 경제의 국가 전체 NET은 서로 다른 부호를 보이는 반면 관련 산업 NET은 모두 양(+)이며, 세계 전체와 EU와의 교역 지표도 다른 방향으로 변화한다. 따라서 탄소국경조정의 영향을 논의할 때에는 생산기반 배출과 소비기반 배출의 차이, 관련 산업의 위치, 실제 규제 시장과의 교역을 구분해 제시해야 한다. 이러한 구분은 생산지의 감축 노력과 수입시장의 수요를 함께 논의하기 위한 출발점이다.'));
C.push(P('구체적으로, 본 연구의 결과에 근거한 제언은 두 가지다. 첫째, 한국과 대만의 산업·통상 담당 부처와 EU 수출기업은 EU 대응 대상을 세계 전체 지표가 아니라 EU와의 교역 지표로 고르고, 그 안에서 실제 CBAM 적용 품목과 시설의 배출 자료로 우선순위를 정할 필요가 있다. 두 나라의 경우 EU와의 교역에서 중심이 되는 기초금속(철강·알루미늄) 밸류체인이 출발점이 된다. 둘째, 국가 전체의 탄소 순수출입 분류를 관련 산업이나 특정 시장에 대한 설명으로 사용하지 않아야 한다.'));
C.push(P('다음 단계의 과제로는, CBAM의 성과를 평가할 때 EU 수입품에 담긴 배출의 변화와 EU 최종수요가 해외에서 유발한 배출의 변화를 함께 제시하는 평가를 검토할 수 있다. 이는 본 연구의 문제의식을 반영한 제안이며, 본 연구가 그 변화를 측정한 것은 아니다.'));
C.push(H2('5.4 한계와 후속 연구'));
C.push(Bullet('**측정 범위.** 실제 CBAM 적용 품목·시설별 부담, EU 최종수요에 따른 책임액, 규제에 따른 생산 이전은 측정하지 않았다. EU와의 교역 수치는 직접 교역 기준이며 제3국 경유 흐름을 포함하지 않는다.'));
C.push(Bullet('**산업 범위.** ICIO 산업 분류는 CBAM 품목보다 넓어 특히 화학 부문이 크게 잡힐 수 있다.'));
C.push(Bullet('**시기.** 주 분석은 2019년, 확장은 2022년까지이며 모두 CBAM 시행 이전이다.'));
C.push(Bullet('**사례.** 한국과 대만은 구조 조건으로 선정한 두 사례이므로 통계적 일반화에는 한계가 있다.'));
C.push(Bullet('**후속 연구.** 최종수요 기준의 원산지 분해로 EU 수요와 연결된 배출을 추정하고, CBAM 시행 이후 자료로 교역 전환과 생산 이전 여부를 검증할 수 있다. 탄소국경조정이 여러 관할권으로 확산될 때 생산지 규제와 소비시장 수요가 어떻게 연결되는지는 검증할 가설로 남긴다.'));

// 6. Conclusion
C.push(H1('6. 결론'));
C.push(P('본 연구는 생산기반·소비기반 회계를 함께 적용하여, 한국과 대만의 탄소무역 관계가 국가 전체와 CBAM 관련 산업, 세계 전체와 EU와의 교역에서 어떻게 달라지는지 분석하였다. 두 나라의 국가 전체 NET은 반대 방향이었으나 관련 산업 NET은 모두 양(+)이었고(RQ1), EU27과의 교역에서는 한국의 국가 전체 NET 부호가 바뀌었으며 관련 산업의 세계 기준 NET이 줄어드는 동안 EU27과의 NET은 늘었다(RQ2).'));
C.push(P('한국과 대만의 사례는 국가 전체의 생산·소비 배출 차이가 탄소국경조정 관련 산업의 위치를 대표하지 못하며, 세계 전체의 교역 관계도 EU와의 관계를 대표하지 못함을 보여준다. 따라서 CBAM 관련 산업을 논의할 때 생산 배출, 소비기반 회계, 대상 시장을 구분해 함께 해석해야 한다. 이 논문은 CBAM의 불공정성이나 책임 분담액을 판정하지 않는다. 대신 탄소국경조정을 둘러싼 책임과 전환을 논의하기 전에, 어떤 배출을 어느 산업과 시장 기준으로 보고 있는지부터 구분해야 한다는 점을 제시한다.'));

// References
C.push(new Paragraph({ children: [new PageBreak()] }));
C.push(H1('참고문헌'));
const refs = [
  'Ambec, S., Esposito, F., & Pacelli, A. (2024). The economics of carbon leakage mitigation policies. Journal of Environmental Economics and Management, 125, 102973.',
  'Amendola, M. (2025). Winners and losers of the EU carbon border adjustment mechanism. An intra-EU issue? Energy Economics, 142, 108139.',
  'Beaufils, T., Ward, H., Jakob, M., & Wenz, L. (2023). Assessing different European Carbon Border Adjustment Mechanism implementations and their impact on trade partners. Communications Earth & Environment, 4, 131. †',
  'Bellora, C., & Fontagné, L. (2023). EU in search of a Carbon Border Adjustment Mechanism. Energy Economics, 123, 106673.',
  'Cezar, R., & Polge, T. (2020). CO2 emissions embodied in international trade. Bulletin de la Banque de France, 228/1. †',
  'Darwili, A., & Schröder, E. (2025). Which countries have offshored carbon dioxide emissions in net terms? Ecological Economics, 235. †',
  'Davis, S. J., & Caldeira, K. (2010). Consumption-based accounting of CO₂ emissions. Proceedings of the National Academy of Sciences, 107(12), 5687–5692.',
  'Dechezleprêtre, A., Haramboure, A., Kögel, C., Lalanne, G., & Yamano, N. (2025). Carbon border adjustments: The potential effects of the EU CBAM along the supply chain. OECD Science, Technology and Industry Working Papers, No. 2025/02. OECD Publishing.',
  'Dobson, N. L. (2022). (Re)framing responsibility? Assessing the division of burdens under the EU Carbon Border Adjustment Mechanism. Utrecht Law Review, 18(2), 162–179. †',
  'European Union. (2023). Regulation (EU) 2023/956 of the European Parliament and of the Council of 10 May 2023 establishing a carbon border adjustment mechanism. Official Journal of the European Union, L 130, 52.',
  'European Union. (2025). Regulation (EU) 2025/2083 of the European Parliament and of the Council of 8 October 2025 amending Regulation (EU) 2023/956 as regards simplifying and strengthening the carbon border adjustment mechanism. Official Journal of the European Union, L 2025/2083.',
  'Franzen, A., & Mader, S. (2018). Consumption-based versus production-based accounting of CO₂ emissions: Is there evidence for carbon leakage? Environmental Science & Policy, 84, 34–40.',
  'HM Treasury and HM Revenue & Customs. (2025). Factsheet: Carbon Border Adjustment Mechanism (CBAM). GOV.UK.',
  'Kander, A., Jiborn, M., Moran, D. D., & Wiedmann, T. O. (2015). National greenhouse-gas accounting for effective climate policy on international trade. Nature Climate Change, 5, 431–435. †',
  'Lenzen, M., Murray, J., Sack, F., & Wiedmann, T. (2007). Shared producer and consumer responsibility — Theory and practice. Ecological Economics, 61(1), 27–42. †',
  'Magacho, G., Espagne, E., & Godin, A. (2024). Impacts of the CBAM on EU trade partners: Consequences for developing countries. Climate Policy, 24(2), 243–259. †',
  'Mehling, M. A., van Asselt, H., Das, K., Droege, S., & Verkuijl, C. (2019). Designing border carbon adjustments for enhanced climate action. American Journal of International Law, 113(3), 433–481.',
  'Perdana, S., & Vielle, M. (2022). Making the EU Carbon Border Adjustment Mechanism acceptable and climate friendly for least developed countries. Energy Policy, 170, 113245.',
  'Peters, G. P., & Hertwich, E. G. (2008). CO₂ embodied in international trade with implications for global climate policy. Environmental Science & Technology, 42(5), 1401–1407.',
  'Su, B., Huang, H. C., Ang, B. W., & Zhou, P. (2010). Input–output analysis of CO₂ emissions embodied in trade: The effects of sector aggregation. Energy Economics, 32(1), 166–175. †',
  'Wiedmann, T. (2009). A review of recent multi-region input–output models used for consumption-based emission and resource accounting. Ecological Economics, 69(2), 211–222.',
  'World Bank. (2023). Relative CBAM exposure index (Technical note). World Bank.',
  'Zhong, J., & Pei, J. (2024). Carbon Border Adjustment Mechanism: A systematic literature review of the latest developments. Climate Policy, 24(2), 228–242.',
  '조홍종·구효정 (2022). 생산기반 온실가스 배출량 vs 소비기반 온실가스 배출량. 자원·환경경제연구, 31(4), 597–617. †',
];
refs.forEach((r) => C.push(new Paragraph({ children: runs(r, { size: 19 }), indent: { left: 567, hanging: 567 }, spacing: { after: 80, line: 300 } })));
C.push(Note('† 표시 문헌은 서지 정보와 인용 내용을 원문으로 확인해야 한다.'));

// Appendix guide
C.push(new Paragraph({ children: [new PageBreak()] }));
C.push(H1('부록 안내'));
C.push(P('기존 원고의 부록 A1–A15 가운데 A2, A4, A12를 제외한 부록을 이 안내 뒤에 그대로 옮겼다. 비고 열의 수정 사항은 아직 반영되지 않았다.'));
C.push(Tbl(['기존 부록', '처리', '비고'],
  [['A1 (한국·대만 개별 민감도)', '유지', '두 나라 합산과 개별 값 구분'],
   ['A2, A4, A12 (EU 주변국·하위지역)', '삭제', '본문 질문과 직접 관련 없음. 나머지 부록 번호는 기존 원고와 대조하기 쉽도록 유지'],
   ['A3 (국가군 구성 민감도)', '유지', '표본 구성 흐름(ICIO 전체 → 48개국)과 싱가포르 제외 사유 통일 추가'],
   ['A5, A9.1–A9.3 (보조 회귀·순열검정·다중비교)', '유지(보조)', '본문에서 제외. "진단적 참고"로 서술'],
   ['A6, A9.4, A9.6 (사례 선정·기준값)', '유지', '본문 표 2와 일치시킴'],
   ['A7, A8 (국가군 무역위치·Tapio 지수)', '유지(보조)', 'DI Gap은 NET 변화와 수식상 연결되어 독립 증거가 아님을 명시'],
   ['A9.5 (기준연도)', '유지', 'A9.8의 "부호 반전" 서술과 일치 여부 확인'],
   ['A9.7 (2022년 확장)', '유지', '본문 4.4와 일치'],
   ['A10 (국가군 상세)', '유지', '그림 범례·그룹명·순서 통일, PWT 버전 표기 정정'],
   ['A11 (목적지 분해)', '유지', '본문 4.3, 그림 4의 근거'],
   ['A13 (EXIOBASE)', '유지', '"본문의 CBE가 최종수요까지 추적하는…" 문장 정정'],
   ['A14 (고소득 24개국 산업 NET)', '유지', '본문 표 3의 산업별 값 근거'],
   ['A15 (48개국 전수표·그림)', '유지', '그림 A15.1–2 점 색 범례 추가']], [3400, 1600, 4026]));
C.push(Caption('**표 A0.** 기존 부록의 처리.'));

C.push(H1('저자 확인 사항'));
[
  '산업별 배출의 귀속 기준(교역 품목 산업 / 배출 발생 산업)과 산업 합계 = 국가 전체 NET 여부 (3.2절)',
  'ICIO 전체 경제 수와 48개국으로 줄어든 제외 사유 (3.1절, 부록 A3)',
  '브루나이의 2019년 제조업 부가가치 비중 값 (표 2)',
  '그림 2(부록 그림 A15.1)의 점 색 구분 기준과 범례',
  '† 표시 참고문헌의 서지와 인용 내용',
  '부록: 표 A0 비고 열의 수정 사항과 용어("역외 선진 제조경제", "부호 가림" 등)를 본문 표현에 맞게 정리',
  '재현 저장소를 2025판 자료·PWT 11.0·현재 그룹명에 맞게 갱신 (Data availability)',
].forEach((t) => C.push(Bullet(t)));

// ---------- document ----------
const doc = new Document({
  creator: 'Hyeree Kim',
  title: 'CBAM 관련 산업의 생산·소비 배출과 탄소무역 구조',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: FONT, color: '14213D' }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: FONT, color: '14213D' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: C,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, 'CBAM_생산소비배출_한국대만_재구성본.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out);
});
