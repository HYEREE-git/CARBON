# -*- coding: utf-8 -*-
"""
04_table_A5_models.py
────────────────────────────────────────────────────────────────────
표 A5의 Model 1–3 (HC1 강건 표준오차)을 공개 패널만으로 완전 재현하고,
Model 3 완전 사양에 대한 Freedman–Lane 순열검정(부록 A9.1 보완 결과)을 수행한다.

변수 정의 (모두 country_panel_48.csv에서 파생):
  DI_PBE, DI_CBE : 1995→2019 Tapio 지수 = (ΔE/E1995)/(ΔGDP/GDP1995)
  DI_Gap         : DI_PBE − DI_CBE  (종속변수)
  int95          : PBE 탄소집약도(1995) = PBE_1995(Mt)×10³ / GDP_1995(백만 2017USD)  [kgCO2e/USD]
  gap95          : PBE–CBE 상대 격차(1995) = (PBE_1995 − CBE_1995) / PBE_1995
  lgdp95         : log GDP(1995)
  ggrow          : GDP 총성장률(1995–2019) = (GDP_2019 − GDP_1995) / GDP_1995
  그룹 더미      : 기준(reference) = EU-Core

출력 : output/table_A5_reproduced.csv + 콘솔 대조
실행 : python code/04_table_A5_models.py
"""
import os
import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

SEED = 20260711
N_PERM = 20000

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)

df = pd.read_csv(os.path.join(ROOT, "data", "country_panel_48.csv"))

def tapio(e0, e1, g0, g1):
    return ((e1 - e0) / e0) / ((g1 - g0) / g0)

df["DI_PBE"] = tapio(df.PBE_1995, df.PBE_2019, df.GDP_1995, df.GDP_2019)
df["DI_CBE"] = tapio(df.CBE_1995, df.CBE_2019, df.GDP_1995, df.GDP_2019)
df["DI_Gap"] = df.DI_PBE - df.DI_CBE
df["int95"] = df.PBE_1995 * 1e3 / df.GDP_1995
df["gap95"] = (df.PBE_1995 - df.CBE_1995) / df.PBE_1995
df["lgdp95"] = np.log(df.GDP_1995)
df["ggrow"] = (df.GDP_2019 - df.GDP_1995) / df.GDP_1995
for g in df.group.unique():
    df["G_" + g.replace(" ", "_").replace("-", "_")] = (df.group == g).astype(int)

M1 = "DI_Gap ~ int95 + gap95"
M2 = M1 + " + lgdp95 + ggrow"
DUMMIES = ["G_EU_Periphery", "G_Non_EU_Sandwich", "G_China", "G_ASEAN",
           "G_High_income_Importer", "G_Resource"]      # 기준 그룹 = EU-Core
M3 = M2 + " + " + " + ".join(DUMMIES)

rows = []
models = {}
for name, f in (("Model 1", M1), ("Model 2", M2), ("Model 3", M3)):
    m = smf.ols(f, data=df).fit(cov_type="HC1")
    models[name] = m
    for k in m.params.index:
        rows.append({"model": name, "term": k, "coef": round(m.params[k], 3),
                     "se_HC1": round(m.bse[k], 3), "p": round(m.pvalues[k], 4)})
    rows.append({"model": name, "term": "R2", "coef": round(m.rsquared, 3),
                 "se_HC1": None, "p": None})
    rows.append({"model": name, "term": "adjR2", "coef": round(m.rsquared_adj, 3),
                 "se_HC1": None, "p": None})
pd.DataFrame(rows).to_csv(os.path.join(OUT, "table_A5_reproduced.csv"), index=False)

m3 = models["Model 3"]
print("[표 A5 재현 — Model 3 주요 계수]")
for k in ["G_Non_EU_Sandwich", "G_China", "G_ASEAN", "G_High_income_Importer",
          "G_Resource", "G_EU_Periphery", "gap95"]:
    print(f"  {k:24s} {m3.params[k]:+.3f} ({m3.bse[k]:.3f})  p={m3.pvalues[k]:.3f}")
print(f"  R2={m3.rsquared:.3f}  adjR2={m3.rsquared_adj:.3f}  N={int(m3.nobs)}")

# ── Freedman–Lane 순열검정 (Model 3 사양, Sandwich 더미) ────────
obs = m3.params["G_Non_EU_Sandwich"]
covars = ["int95", "gap95", "lgdp95", "ggrow", "G_EU_Periphery", "G_China",
          "G_ASEAN", "G_High_income_Importer", "G_Resource"]
reduced = smf.ols("DI_Gap ~ " + " + ".join(covars), data=df).fit()
fitted, resid = reduced.fittedvalues.values, reduced.resid.values
X = sm.add_constant(df[["G_Non_EU_Sandwich"] + covars]).values
rng = np.random.default_rng(SEED)
cnt = 0
for _ in range(N_PERM):
    ystar = fitted + rng.permutation(resid)
    beta = np.linalg.lstsq(X, ystar, rcond=None)[0]
    if abs(beta[1]) >= abs(obs):
        cnt += 1
p_fl = cnt / N_PERM
print(f"\n[Freedman–Lane 순열검정] Model 3 사양, B={N_PERM:,}, seed={SEED}")
print(f"  관측 계수 {obs:+.3f} | 경험적 p = {p_fl:.3f}")

# ── 게재 수치 대조 ───────────────────────────────────────────────
print("\n=== 게재 수치 대조 (표 A5·A9.1) ===")
checks = [
    ("Model 3 Sandwich +0.295", m3.params["G_Non_EU_Sandwich"], 0.295),
    ("Model 3 Sandwich SE 0.131", m3.bse["G_Non_EU_Sandwich"], 0.131),
    ("Model 3 Sandwich p 0.024", m3.pvalues["G_Non_EU_Sandwich"], 0.024),
    ("Model 3 China +0.331", m3.params["G_China"], 0.331),
    ("Model 3 ASEAN +0.277", m3.params["G_ASEAN"], 0.277),
    ("Model 3 Adv non-EU +0.209", m3.params["G_High_income_Importer"], 0.209),
    ("Model 3 R2 0.362", m3.rsquared, 0.362),
    ("Model 1 gap95 -0.481", models["Model 1"].params["gap95"], -0.481),
    ("Model 2 R2 0.186", models["Model 2"].rsquared, 0.186),
    ("A9.1 Freedman–Lane p 0.036", p_fl, 0.036),
]
for label, got, want in checks:
    flag = "OK " if abs(float(got) - want) < 2.5e-3 else "Δ!!"
    print(f"  [{flag}] {label:28s} 재현 {float(got):+.3f}")
