# ベースイメージ
FROM node:22

# 作業ディレクトリを設定
WORKDIR /usr/src/frontend

# 必要なファイルをコピー
COPY ./frontend/package*.json ./

# 依存関係をインストール
RUN npm install

# 開発サーバーを起動
CMD ["npm", "run", "dev"]

# ポートの公開
EXPOSE 5175