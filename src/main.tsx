/**
 * main.tsx — Ponto de entrada da aplicação
 * Conecta a UI (WalletUI.tsx) ao backend blockchain (@meshsdk/core + bip39)
 *
 * Configuração do ambiente:
 *   1. npm create vite@latest mini-lace -- --template react-ts
 *   2. cd mini-lace
 *   3. npm install @meshsdk/core bip39 @types/bip39
 *   4. Cole WalletUI.tsx em src/
 *   5. Substitua src/main.tsx por este arquivo
 *   6. Em index.html: <div id="root"></div>
 *   7. npm run dev
 *
 * Dependências no package.json (além do Vite/React padrão):
 *   "@meshsdk/core": "^1.x",
 *   "bip39": "^3.x"
 *
 * Observação sobre Blockfrost:
 *   Crie uma API Key gratuita em https://blockfrost.io/
 *   Selecione a rede "Preview" ao criar o projeto.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  resolvePaymentKeyHash,
} from "@meshsdk/core";
import * as bip39 from "bip39";
import { WalletApp } from "./WalletUI";
import './index.css'

// ── Provedor Blockfrost (rede Preview) ────────────────────────────────────────
// Substitua pela sua API Key: https://blockfrost.io/
const BLOCKFROST_KEY = "previewL8RRPgiUgzwPJSveUDHYXps4RJv9fH9L";
const provider = new BlockfrostProvider(BLOCKFROST_KEY);

// Mantém a instância da wallet na memória da sessão
// (nunca persiste no localStorage — segurança stateless)
let walletInstance: MeshWallet | null = null;

// ── Callbacks de integração passados para a UI ────────────────────────────────

/** Gera 24 palavras BIP-39 aleatórias */
function handleGenerateMnemonic(): string[] {
  // MeshWallet.brew() retorna string[] com 24 palavras
  return MeshWallet.brew() as string[];
}

/** Valida o checksum BIP-39 da frase semente (usa SHA-256 internamente) */
function handleValidateMnemonic(words: string[]): boolean {
  return bip39.validateMnemonic(words.join(" "));
}

/** Instancia a wallet e retorna endereço + saldo */
async function handleLoadWallet(words: string[]) {
  walletInstance = new MeshWallet({
    networkId: 0,           // 0 = testnet (Preview/Preprod)
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: words,
    },
  });

  const address = await walletInstance.getChangeAddress();
  const assets  = await walletInstance.getBalance();

  // assets[0] é sempre o ADA (lovelace); outros índices são tokens nativos
  const lovelace = Number(assets[0]?.quantity ?? 0);

  return {
    address,
    balance: { ada: lovelace / 1_000_000, lovelace },
  };
}

/** Atualiza o saldo buscando UTxOs no Blockfrost */
async function handleRefreshBalance(address: string) {
  if (!walletInstance) throw new Error("Wallet não carregada.");
  const assets  = await walletInstance.getBalance();
  const lovelace = Number(assets[0]?.quantity ?? 0);
  return { ada: lovelace / 1_000_000, lovelace };
}

/** Constrói, assina e submete uma transação */
async function handleSendTransaction({
  fromAddress,
  toAddress,
  amountLovelace,
}: {
  fromAddress: string;
  toAddress: string;
  amountLovelace: number;
}): Promise<string> {
  if (!walletInstance) throw new Error("Wallet não carregada.");

  // Valida endereço de destino (resolvePaymentKeyHash lança exceção se inválido)
  try {
    resolvePaymentKeyHash(toAddress);
  } catch {
    throw new Error("Endereço de destino inválido.");
  }

  // Busca parâmetros da rede e UTxOs disponíveis
  const params = await provider.fetchProtocolParameters();
  const utxos  = await walletInstance.getUtxos();

  // Constrói a transação
  const txBuilder = new MeshTxBuilder({
    fetcher:  provider,
    verbose:  true,   // log detalhado no console (remova em produção)
    params,
  });
  txBuilder.setNetwork("preview");

  const unsignedTx = await txBuilder
    .txOut(toAddress, [{ unit: "lovelace", quantity: String(amountLovelace) }])
    .changeAddress(fromAddress)
    .selectUtxosFrom(utxos)
    .complete();

  // Assinatura local — o mnemônico nunca sai do navegador/Node.js
  const signedTx = await walletInstance.signTx(unsignedTx);
  const txHash   = await walletInstance.submitTx(signedTx);

  console.log("Transação enviada:", txHash);
  console.log(`https://preview.cardanoscan.io/transaction/${txHash}`);

  return txHash;
}

// ── Renderização ──────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletApp
      onGenerateMnemonic={handleGenerateMnemonic}
      onValidateMnemonic={handleValidateMnemonic}
      onLoadWallet={handleLoadWallet}
      onRefreshBalance={handleRefreshBalance}
      onSendTransaction={handleSendTransaction}
    />
  </React.StrictMode>
);