// src/views/Profile.tsx
import React from 'react'
import CardShell from './CardShell'

const Profile: React.FC = () => {
  const sec: React.CSSProperties = { margin: 'clamp(8px, 1.4vw, 12px) 0' }
  const h4: React.CSSProperties = { margin: '6px 0', fontSize: 'clamp(13px,1.6vw,15px)', opacity: 0.9 }
  const ul: React.CSSProperties = { margin: 0, paddingLeft: 18 }

  return (
    <CardShell title="プロフィール" widthMin={280} widthMax={520}>
      <div style={{ fontSize: 'clamp(18px, 2.2vw, 22px)', fontWeight: 700, marginBottom: 10 }}>
        小川 慶太（おがわ けいた）
      </div>

      <section style={sec}>
        <h4 style={h4}>基本情報</h4>
        <ul style={ul}>
          <li>所属：佐賀大学 大学院 理工学研究科 知能情報工学コース（M1）</li>
          <li>専攻：知能情報工学 / 数学</li>
          <li>出身：福岡県久留米市</li>
          <li>誕生日：2025年05月23日（23歳）</li>
          <li>趣味：ゲーム / 漫画 / 釣り / 旅行 / 映画鑑賞</li>
          <li>連絡先：25726010@edu.cc.saga-u.ac.jp</li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}>経歴</h4>
        <ul style={ul}>
          <li>2018年 4月 福岡県立明善高等学校 理数科 入学</li>
          <li>2021年 3月 福岡県立明善高等学校 理数科 卒業</li>
          <li>2021年 4月 佐賀大学 理工学部 理工学科 入学</li>
          <li>2025年 3月 佐賀大学 理工学部 理工学科 数理サイエンスコース 卒業</li>
          <li>2025年 4月 佐賀大学大学院 理工学研究科 知能情報工学コース 入学</li>
          <li>2027年 3月 佐賀大学大学院 理工学研究科 知能情報工学コース 修了予定</li>
        </ul>
      </section>
      
    </CardShell>
  )
}

export default Profile
