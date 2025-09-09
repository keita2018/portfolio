import React from 'react'
import CardShell from './CardShell'

const Experience: React.FC = () => {
  const sec: React.CSSProperties = { margin: 'clamp(8px, 1.4vw, 12px) 0' }
  const h4: React.CSSProperties = { margin: '6px 0', fontSize: 'clamp(13px,1.6vw,15px)', opacity: 0.9 }
  const ul: React.CSSProperties = { margin: 0, paddingLeft: 18 }
  const appName: React.CSSProperties = { color: '#FFB000', fontWeight: 700 };
  const titleName: React.CSSProperties = { color: '#5fe4a2ff', fontWeight: 700 };
  const placeName: React.CSSProperties = { color: '#aab1f0ff', fontWeight: 700 };

  return (
    <CardShell title="開発経験" widthMin={300} widthMax={580}>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>研究情報</span></h4>
        <ul style={ul}>
          <li>
            <strong>テーマ：</strong>視線運動検知による入力操作の前兆推定<br />
            <strong>内容：</strong>本研究では，ユーザーが入力操作を行う直前の「視線や表情の特徴的なパターン」を捉え，操作意図を推定するモデルの構築を目的としています．
            従来の視線入力は「注視＝クリック」といった静的操作が中心でしたが，動的で高自由度な環境（例：ゲームプレイ）では操作性や没入感に課題がありました．
            そこで，視線運動・顔特徴量・マウス・キーボード入力を時系列データとして収集し，LSTMを用いた二値分類モデル（入力意図あり/入力意図なし）を構築しました．
            自由プレイ環境で得たデータを用いた実験の結果，入力意図ありクラスで Recall 0.95、F1-score 0.84 と高い性能を示し，自然な行動データから入力操作の前兆を検出可能であることを確認しました．
            今後は，データ数の拡充や多クラス分類への展開を通じて，直感的で負担の少ないヒューマンコンピュータインタラクションの実現を目指しています．
          </li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>制作物</span></h4>
        <ul style={ul}>
          <li>
            <strong>概要：</strong><span style={appName}>tagdle（物品管理アプリ）</span><br />
            <strong>取り組んだ場所：</strong>ハッカソン<br />
            <strong>技術スタック：</strong>
            <ul
              style={{
                margin: '6px 0 10px 1.25rem',
                paddingLeft: '1rem',
                listStyle: 'disc',
              }}
            >
              <li><strong>フロントエンド：</strong>Vite, React, TypeScript</li>
              <li><strong>バックエンド：</strong>FastAPI</li>
              <li><strong>データベース：</strong>MySQL</li>
              <li><strong>認証：</strong>JWT</li>
              <li><strong>その他：</strong>Docker, QRコード読取ライブラリ</li>
            </ul>
            <strong>工夫した点：</strong><br />
            開発期間：24時間／役割：フロントエンド・チーム全体の進捗管理
          </li>
          <li>
            <strong>概要：</strong><span style={appName}>ログイン認証＋予約システム</span><br />
            <strong>取り組んだ場所：</strong>趣味<br />
            <strong>技術スタック：</strong>
            <ul
              style={{
                margin: '6px 0 10px 1.25rem',
                paddingLeft: '1rem',
                listStyle: 'disc',
              }}
            >
              <li><strong>フロントエンド：</strong>Vite, Qwik, TypeScript</li>
              <li><strong>バックエンド：</strong>Ruby on Rails</li>
              <li><strong>データベース：</strong>PostgreSQL，Redis</li>
              <li><strong>認証：</strong>JWT</li>
              <li><strong>その他：</strong>Sidekiq，Docker</li>
            </ul>
            <strong>工夫した点：</strong><br />
            開発期間：10日間／役割：個人開発
          </li>
          <li>
            <strong>概要：</strong><span style={appName}>チャットアプリ</span><br />
            <strong>取り組んだ場所：</strong>趣味<br />
            <strong>技術スタック：</strong>
            <ul
              style={{
                margin: '6px 0 10px 1.25rem',
                paddingLeft: '1rem',
                listStyle: 'disc',
              }}
            >
              <li><strong>フロントエンド：</strong>Flutter</li>
              <li><strong>バックエンド：</strong>Ruby on Rails</li>
              <li><strong>データベース：</strong>PostgreSQL</li>
              <li><strong>その他：</strong>FVM，Docker，GroqAPI</li>
            </ul>
            <strong>工夫した点：</strong><br />
            開発期間：2日間／役割：個人開発
          </li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>インターン・アルバイト</span></h4>
        <ul style={ul}>
          <li>
            <strong>インターン先：</strong><span style={placeName}>株式会社トヨタシステムズ</span><br />
            <strong>期間：</strong>9月2日，9月3日（2日間）<br />
            <strong>内容：</strong>
          </li>
          <li>
            <strong>インターン先：</strong><span style={placeName}>シンプレクス・ホールディングス株式会社</span><br />
            <strong>期間：</strong>9月9日（1日間）<br />
            <strong>内容：</strong>
          </li>
          <li>
            <strong>インターン先：</strong><span style={placeName}>富士通株式会社</span><br />
            <strong>期間：</strong>2025年11月予定（1か月）<br />
            <strong>内容：</strong>体験次第記述
          </li>
        </ul>
      </section>
    </CardShell>
  )
}

export default Experience
