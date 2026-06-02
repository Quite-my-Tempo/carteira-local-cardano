# Carteira Local Cardano

Este projeto é uma web wallet criada durante a disciplina de Projeto Transversal em Redes de Comunicação 1. O objetivo principal é aplicar conceitos de redes descentralizadas e criptografia na prática.

## 📌 Visão Geral
A aplicação engloba conceitos fundamentais do ecossistema Cardano, como a criação e recuperação de chaves pública e privada a partir de 24 palavras (padrão BIP39), além de interagir com a blockchain utilizando a API do Blockfrost.

## 🛠️ Tecnologias Utilizadas
* **Frontend:** [React / Vue] + Vite
* **Linguagem:** TypeScript
* **Blockchain/Web3:** [Mesh SDK / Lucid Evolution] 
* **Infraestrutura:** Blockfrost API

## ✨ Funcionalidades Atuais

* **Geração de Carteira:** Criação de um novo par de chaves criptográficas a partir de um mnemônico de 24 palavras (padrão BIP39).
* **Recuperação de Acesso:** Restauração de carteiras já existentes utilizando a seed phrase.
* **Consulta de Saldo:** Conexão com a rede (via API do Blockfrost) para varrer os endereços da carteira e exibir o saldo disponível ao usuário.

## 🚧 Trabalhos Futuros

Como a infraestrutura base de chaves e conexão com a blockchain já está estabelecida, as próximas iterações do projeto preveem:
* Implementação da construção e assinatura de transações.
* Gerenciamento e visualização detalhada de UTXOs (Unspent Transaction Outputs).
* Integração de bibliotecas específicas para montar as transações na rede (ex: Mesh SDK ou Lucid).

## 🚀 Como executar o projeto localmente

### Pré-requisitos
* Node.js instalado.
* Uma chave de API (Project ID) do [Blockfrost](https://blockfrost.io/).

### Passos
1. Clone o repositório:
   ```bash
     git clone https://github.com/Quite-my-Tempo/carteira-local-cardano.git
   ```
2. Instale as dependências:
   ```bash
     npm install
   ```
3. Crie um arquivo .env na raiz e adicione sua chave blockfrost:
   ```bash
     BLOCKFROST_CARDANO_API_KEY=sua_chave_aqui
   ```
4. Inicie o projeto:
   ```bash
     `npm run dev
   ```
