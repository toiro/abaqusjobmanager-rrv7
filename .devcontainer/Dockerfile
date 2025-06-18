
# FROM oven/bun:latest
FROM ghcr.io/nhaef/devcontainer-bun:latest

ARG USERNAME=bun

USER root

# 必要なツールのインストール
RUN apt-get update && \
    apt-get install -y curl gnupg ca-certificates unzip openssh-client sudo sqlite3
    # PowerShell 7 のインストール
RUN curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg && \
    install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/ && \
    sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/ubuntu/22.04/prod jammy main" > /etc/apt/sources.list.d/microsoft.list' && \
    apt-get update && \
    apt-get install -y powershell && \
    # クリーンアップ
    rm -rf /var/lib/apt/lists/* microsoft.gpg
    # Node.js (LTS) のインストール
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - && \
    apt-get install -y nodejs




# ユーザーの追加
# RUN groupadd --gid $USER_GID $USERNAME && \
# RUN adduser --uid $USER_UID --gid $USER_GID --disabled-password --gecos "" $USERNAME && \
#     usermod -aG sudo $USERNAME
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# sshd_config 設定
COPY ./ssh/sshd_config /etc/ssh/sshd_config
RUN chmod 600 /etc/ssh/sshd_config

# ワークスペースディレクトリの設定
RUN mkdir /app &&\
    chown ${USERNAME} /app



COPY ./ssh/.ssh /home/$USERNAME/.ssh
RUN chown ${USERNAME} /home/$USERNAME/.ssh /home/$USERNAME/.ssh/*


# 環境変数の設定
ENV PATH="/root/.bun/bin:$PATH"

# devcontainer上で使用するユーザを指定
USER ${USERNAME}
