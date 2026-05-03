/**
 *
 *
 * Como usar:
 *   1. npm install react react-dom @types/react @types/react-dom
 *   2. Renderize <WalletApp /> passando as callbacks de integração (ver props abaixo)
 *   3. As funções de blockchain (meshsdk/bip39) ficam no seu arquivo principal
 *      e são passadas como props — a UI nunca chama a rede diretamente.
 *
 * Ambiente: Vite + React + TypeScript
 *   npm create vite@latest mini-lace -- --template react-ts
 *   cd mini-lace && npm install @meshsdk/core bip39
 */

import { useState, useCallback, type CSSProperties, useEffect } from "react";


// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  ada: number;
  lovelace: number;
}

export interface Transaction {
  hash: string;
  type: "received" | "sent";
  amount: number;       // em ADA
  date: string;
}

/** Props de integração: conecte seu código meshsdk/bip39 aqui */
export interface WalletAppProps {
  /**
   * Gera um novo mnemônico BIP-39 de 24 palavras.
   * Integração: return MeshWallet.brew();
   */
  onGenerateMnemonic: () => string[];

  /**
   * Valida o checksum BIP-39 da frase semente.
   * Integração: return bip39.validateMnemonic(words.join(" "));
   */
  onValidateMnemonic: (words: string[]) => boolean;

  /**
   * Carrega a carteira a partir do mnemônico e retorna endereço + saldo.
   * Integração: new MeshWallet({ networkId: 0, ... }) -> getChangeAddress() + getBalance()
   */
  onLoadWallet: (words: string[]) => Promise<{ address: string; balance: WalletBalance }>;

  /**
   * Atualiza o saldo buscando no Blockfrost.
   * Integração: wallet.getBalance() -> converter para { ada, lovelace }
   */
  onRefreshBalance: (address: string) => Promise<WalletBalance>;

  /**
   * Constrói, assina e submete uma transação.
   * Integração: txBuilder -> wallet.signTx -> wallet.submitTx -> retorna txHash
   */
  onSendTransaction: (params: {
    fromAddress: string;
    toAddress: string;
    amountLovelace: number;
  }) => Promise<string>;
}

// ─── TEMA / ESTILOS ───────────────────────────────────────────────────────────

const C = {
  bg:           "#0b0f1a",
  surface:      "#141926",
  border:       "#1e2a3a",
  accent:       "#0ea5e9",
  accentDark:   "#0c3a52",
  gold:         "#f59e0b",
  goldDark:     "#3d2e0a",
  text:         "#e2e8f0",
  muted:        "#64748b",
  dim:          "#94a3b8",
  success:      "#10b981",
  error:        "#ef4444",
  errorDark:    "#3d1212",
  errorBorder:  "#7f1d1d",
} as const;

const base: Record<string, CSSProperties> = {
  app: {
  background: C.bg,
  minHeight: "100vh",
  padding: "1.5rem 1rem",
},
container: {
  width: "100%",
  maxWidth: 560,
  margin: "0 auto",   // centraliza sem usar flexbox
},
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "1.25rem",
  },
  mono: {
    fontFamily: "'Space Mono', 'Courier New', monospace",
  },
  label: {
    fontSize: 10,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    display: "block",
    marginBottom: 3,
  } as CSSProperties,
  input: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    padding: "9px 11px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  } as CSSProperties,
};

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────


/** Encurta endereço para exibição */
function shortAddr(addr: string): string {
  return addr.slice(0, 18) + "..." + addr.slice(-8);
}

// ─── COMPONENTES MENORES ──────────────────────────────────────────────────────

function Btn({
  children,
  onClick,
  variant = "primary",
  full = false,
  small = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  full?: boolean;
  small?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const variantStyle: CSSProperties =
    variant === "primary"
      ? { background: C.accent, color: "#fff", border: "none" }
      : variant === "secondary"
      ? { background: "transparent", color: C.accent, border: `1px solid ${C.accent}` }
      : { background: "transparent", color: C.error, border: `1px solid #2d1010` };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "5px 11px" : "9px 18px",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        width: full ? "100%" : undefined,
        opacity: disabled ? 0.6 : 1,
        transition: "opacity .15s",
        fontFamily: "inherit",
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Banner({ msg, type = "info" }: { msg: string; type?: "info" | "error" | "success" }) {
  const bg = type === "error" ? C.errorDark : type === "success" ? "#0c3a2e" : "#0c3a52";
  const border = type === "error" ? C.errorBorder : type === "success" ? "#065f46" : C.accentDark;
  const color = type === "error" ? "#fca5a5" : type === "success" ? "#6ee7b7" : "#7dd3fc";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 13px", fontSize: 12, color, marginBottom: "1rem" }}>
      {msg}
    </div>
  );
}

function MnemonicGrid({ words }: { words: string[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: "1.125rem" }}>
      {words.map((w, i) => (
        <div
          key={i}
          style={{
            background: C.accentDark,
            borderRadius: 6,
            padding: "4px 7px",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "#7dd3fc",
            ...base.mono,
          }}
        >
          <span style={{ color: C.accent, fontSize: 9, minWidth: 14 }}>{i + 1}</span>
          {w}
        </div>
      ))}
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ ...base.mono, fontSize: 11, color: C.dim }}>{tx.hash.slice(0, 20)}...{tx.hash.slice(-6)}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{tx.date}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: tx.type === "received" ? C.success : C.gold }}>
          {tx.type === "received" ? "+" : "-"}{tx.amount} ADA
        </span>
        <div style={{ fontSize: 10, color: C.muted }}>{tx.type === "received" ? "Recebido" : "Enviado"}</div>
      </div>
    </div>
  );
}

// ─── TELA: HOME ───────────────────────────────────────────────────────────────

function HomeView({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
      {/* Logo ADA */}
      <div style={{ width: 60, height: 60, background: C.accentDark, borderRadius: "50%", margin: "0 auto 1.25rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: C.accent, ...base.mono }}>
        <img
            src="/src/assets/cardano.png"
            alt="Cardano"
            style={{ width: 72, height: 72, margin: "0 auto 1.25rem", display: "block" }}
          />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: C.text }}>Mini-Lace</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: ".5rem 0 2rem" }}>Cardano Testnet — Preview</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", maxWidth: 380, margin: "0 auto" }}>
        {/* Criar nova */}
        <OptionCard
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
          iconBg={C.accentDark}
          hoverBorder={C.accent}
          title="Nova Carteira"
          subtitle="Gerar 24 palavras"
          onClick={onNew}
        />
        {/* Importar */}
        <OptionCard
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2">
              <circle cx="8" cy="15" r="4" /><path d="M12 15h8m-2-2v4" />
            </svg>
          }
          iconBg={C.goldDark}
          hoverBorder={C.gold}
          title="Importar"
          subtitle="Usar frase semente"
          onClick={onImport}
        />
      </div>
    </div>
  );
}

function OptionCard({ icon, iconBg, hoverBorder, title, subtitle, onClick }: {
  icon: React.ReactNode; iconBg: string; hoverBorder: string;
  title: string; subtitle: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: C.surface, border: `1px solid ${hovered ? hoverBorder : C.border}`, borderRadius: 12, padding: "1.25rem", cursor: "pointer", textAlign: "left", color: C.text, fontFamily: "inherit", transition: "border-color .2s", width: "100%" }}
    >
      <div style={{ width: 34, height: 34, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: ".625rem" }}>{icon}</div>
      <p style={{ fontWeight: 600, margin: "0 0 3px", fontSize: 13 }}>{title}</p>
      <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>{subtitle}</p>
    </button>
  );
}

// ─── TELA: CRIAR CARTEIRA ─────────────────────────────────────────────────────

function CreateView({
  onBack,
  onEnter,
  onGenerateMnemonic,
}: {
  onBack: () => void;
  onEnter: (words: string[]) => void;
  onGenerateMnemonic: () => string[];
}) {
  // Gera mnemônico ao montar — integração: MeshWallet.brew()
  const [words] = useState<string[]>(() => onGenerateMnemonic());
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(words.join(" ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [words]);

  return (
    <div style={{ padding: "1.375rem" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
        <Btn variant="secondary" small onClick={onBack}>← Voltar</Btn>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Nova Carteira</span>
      </div>

      {/* Aviso de segurança */}
      <Banner
        type="error"
        msg="⚠️ ATENÇÃO: Guarde estas 24 palavras em local seguro e offline. Sem elas, você perde o acesso permanentemente à sua carteira."
      />

      {/* Grade de palavras */}
      <MnemonicGrid words={words} />

      {/* Botões */}
      <div style={{ display: "flex", gap: 7 }}>
        <Btn variant="secondary" style={{ flex: 1, fontSize: 12 }} onClick={handleCopy}>
          {copied ? "✓ Copiado!" : "Copiar Palavras"}
        </Btn>
        <Btn variant="primary" style={{ flex: 1, fontSize: 12 }} onClick={() => onEnter(words)}>
          Acessar Carteira
        </Btn>
      </div>
    </div>
  );
}

// ─── TELA: IMPORTAR CARTEIRA ──────────────────────────────────────────────────

function ImportView({
  onBack,
  onEnter,
  onValidateMnemonic,
}: {
  onBack: () => void;
  onEnter: (words: string[]) => void;
  onValidateMnemonic: (words: string[]) => boolean;
}) {
  const [words, setWords] = useState<string[]>(Array(24).fill(""));
  const [error, setError] = useState<string | null>(null);

  const setWord = (i: number, val: string) => {
    setWords((prev) => { const next = [...prev]; next[i] = val.trim().toLowerCase(); return next; });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Permite colar todas as 24 palavras de uma vez no primeiro campo
    const pasted = e.clipboardData.getData("text").trim().split(/\s+/);
    if (pasted.length === 24) {
      e.preventDefault();
      setWords(pasted.map((w) => w.toLowerCase()));
    }
  };

  const handleValidate = () => {
    const filled = words.filter((w) => w.length > 0).length;
    if (filled < 24) { setError(`Faltam ${24 - filled} palavra(s). Preencha todas as 24.`); return; }

    // Integração: bip39.validateMnemonic(words.join(" "))
    const valid = onValidateMnemonic(words);
    if (!valid) { setError("Frase semente inválida (checksum BIP-39 falhou). Verifique as palavras."); return; }

    setError(null);
    onEnter(words);
  };

  return (
    <div style={{ padding: "1.375rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.125rem" }}>
        <Btn variant="secondary" small onClick={onBack}>← Voltar</Btn>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Importar Carteira</span>
      </div>

      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 .875rem" }}>
        Digite as 24 palavras da frase semente (BIP-39). Você pode colar todas de uma vez no campo 1.
      </p>

      {/* Grade de inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: ".875rem" }}>
        {words.map((w, i) => (
          <div key={i} style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 5, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: C.muted, pointerEvents: "none" }}>
              {i + 1}
            </span>
            <input
              className="wl-word-input"
              value={w}
              onChange={(e) => setWord(i, e.target.value)}
              onPaste={i === 0 ? handlePaste : undefined}
              placeholder="palavra"
              style={{ ...base.input, ...base.mono, paddingLeft: 20, fontSize: 11 }}
            />
          </div>
        ))}
      </div>

      {error && <Banner type="error" msg={error} />}

      <Btn variant="primary" full onClick={handleValidate}>
        Validar e Acessar
      </Btn>
    </div>
  );
}

// ─── TELA: DASHBOARD ─────────────────────────────────────────────────────────

function DashboardView({
  address,
  balance: initialBalance,
  txHistory: initialHistory,
  onLogout,
  onRefreshBalance,
  onSendTransaction,
}: {
  address: string;
  balance: WalletBalance;
  txHistory: Transaction[];
  onLogout: () => void;
  onRefreshBalance: (addr: string) => Promise<WalletBalance>;
  onSendTransaction: (p: { fromAddress: string; toAddress: string; amountLovelace: number }) => Promise<string>;
}) {
  const [balance, setBalance] = useState<WalletBalance>(initialBalance);
  const [history, setHistory]  = useState<Transaction[]>(initialHistory);
  const [toAddr, setToAddr]    = useState("");
  const [amtAda, setAmtAda]    = useState("");
  const [loading, setLoading]  = useState(false);
  const [sendErr, setSendErr]  = useState<string | null>(null);
  const [txNotif, setTxNotif]  = useState<string | null>(null);
  const [copied, setCopied]    = useState(false);

  useEffect(() => {
  // Atualiza imediatamente ao entrar no dashboard
  handleRefresh();

  // Depois atualiza a cada 30 segundos
  const interval = setInterval(() => {
    handleRefresh();
  }, 30_000);

  // Limpa o intervalo ao sair da tela
  return () => clearInterval(interval);
  }, []); // roda só uma vez ao montar

  const feeEstimate = 0.17; // ADA — valor fixo para exibição; o real vem do txBuilder

  // ── Atualizar saldo ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      // Integração: provider via BlockfrostProvider("previewXXX")
      const b = await onRefreshBalance(address);
      setBalance(b);
    } finally {
      setLoading(false);
    }
  }, [address, onRefreshBalance]);

  // ── Enviar transação ───────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    setSendErr(null);
    const amt = parseFloat(amtAda);

    // Validações de UX
    if (!toAddr.trim()) { setSendErr("Informe o endereço de destino."); return; }
    if (!toAddr.startsWith("addr_test")) { setSendErr("Endereço inválido. Deve começar com addr_test... na rede Preview."); return; }
    if (!amt || amt <= 0) { setSendErr("Informe uma quantidade válida de ADA."); return; }
    if (amt + feeEstimate > balance.ada) { setSendErr(`Saldo insuficiente. Você tem ${balance.ada.toFixed(6)} ADA (inclua a taxa de ~${feeEstimate} ADA).`); return; }

    setLoading(true);
    try {
      // Integração: txBuilder -> wallet.signTx -> wallet.submitTx
      const amountLovelace = Math.floor(amt * 1_000_000);
      const hash = await onSendTransaction({ fromAddress: address, toAddress: toAddr, amountLovelace });

      // Atualiza histórico da sessão
      const newTx: Transaction = {
        hash,
        type: "sent",
        amount: amt,
        date: new Date().toLocaleDateString("pt-BR"),
      };
      setHistory((prev) => [newTx, ...prev]);
      setTxNotif(hash);
      setToAddr("");
      setAmtAda("");

      // Atualiza saldo após envio
      const newBalance = await onRefreshBalance(address);
      setBalance(newBalance);
    } catch (err: unknown) {
      setSendErr(err instanceof Error ? err.message : "Erro ao enviar transação.");
    } finally {
      setLoading(false);
    }
  }, [toAddr, amtAda, balance.ada, address, onSendTransaction, onRefreshBalance]);

  const copyAddress = () => {
    navigator.clipboard?.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ padding: "1.375rem" }}>

      {/* ── Barra de endereço + ações ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.125rem", paddingBottom: "1rem", borderBottom: `1px solid ${C.border}` }}>
        <div>
          <span style={{ ...base.label }}>Endereço da Carteira</span>
          <div style={{ ...base.mono, fontSize: 11, color: C.accent }}>{shortAddr(address)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <Btn variant="secondary" small onClick={copyAddress}>{copied ? "✓" : "Copiar"}</Btn>
          {/* Logout: limpa o mnemônico da memória (stateless security) */}
          <Btn variant="danger" small onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      {/* ── Cartão de saldo ── */}
      <div style={{ ...base.card, textAlign: "center", marginBottom: ".875rem" }}>
        <span style={{ ...base.label }}>Saldo Disponível</span>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.gold, ...base.mono, letterSpacing: "-.01em" }}>
          {balance.ada.toFixed(6)} <span style={{ fontSize: 16, opacity: .7 }}>ADA</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, margin: "4px 0 .75rem" }}>
          {balance.lovelace.toLocaleString("pt-BR")} lovelaces
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <Btn variant="secondary" small onClick={handleRefresh} disabled={loading}>
            {loading ? "Atualizando..." : "↻ Atualizar"}
          </Btn>
          <span style={{ fontSize: 10, color: C.muted }}>
            auto a cada 30s
          </span>
        </div>
      </div>

      {/* ── Formulário de envio ── */}
      <div style={{ ...base.card, marginBottom: ".875rem" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.dim, marginBottom: ".75rem" }}>
          Enviar ADA
        </div>

        <label style={{ ...base.label }}>Endereço Destinatário</label>
        <input
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value)}
          placeholder="addr_test1..."
          style={{ ...base.input, ...base.mono, fontSize: 11, marginBottom: ".5rem" }}
        />

        <label style={{ ...base.label }}>Quantidade (ADA)</label>
        <input
          type="number"
          min="1"
          step="1"
          value={amtAda}
          onChange={(e) => setAmtAda(e.target.value)}
          placeholder="5"
          style={{ ...base.input, marginBottom: ".5rem" }}
        />

        <div style={{ fontSize: 11, color: C.muted, marginBottom: ".75rem" }}>
          Taxa estimada: ~{feeEstimate} ADA (calculada pelo MeshTxBuilder antes do envio)
        </div>

        {sendErr && <Banner type="error" msg={sendErr} />}

        <Btn variant="primary" full onClick={handleSend} disabled={loading}>
          {loading ? "Enviando..." : "Enviar Transação"}
        </Btn>

        {/* Link para o explorador após envio */}
        {txNotif && (
          <div style={{ marginTop: ".75rem", fontSize: 11, color: C.muted }}>
            Hash:{" "}
            <a
              href={`https://preview.cardanoscan.io/transaction/${txNotif}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: C.accent, ...base.mono }}
            >
              {txNotif.slice(0, 20)}...
            </a>{" "}
            (pode demorar 20s para aparecer)
          </div>
        )}
      </div>

      {/* ── Histórico da sessão ── */}
      <div style={{ ...base.card }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.dim, marginBottom: ".625rem" }}>
          Histórico da Sessão
        </div>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: C.muted, textAlign: "center", margin: "1rem 0" }}>
            Nenhuma transação nesta sessão.
          </p>
        ) : (
          history.map((tx, i) => <TxRow key={i} tx={tx} />)
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

type Screen = "home" | "create" | "import" | "dashboard";

interface WalletState {
  address: string;
  balance: WalletBalance;
  txHistory: Transaction[];
}

export function WalletApp(props: WalletAppProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [wallet, setWallet] = useState<WalletState | null>(null);

  // Carrega a carteira (usado tanto em create quanto import)
  const loadWallet = async (words: string[]) => {
    // Integração: new MeshWallet({ networkId: 0, fetcher: provider, submitter: provider, key: { type: 'mnemonic', words } })
    const result = await props.onLoadWallet(words);
    setWallet({
      address: result.address,
      balance: result.balance,
      txHistory: [],
    });
    setScreen("dashboard");
  };

  // Logout: limpa tudo da memória (sem persistência — segurança stateless)
  const handleLogout = () => {
    setWallet(null);
    setScreen("home");
  };

  return (
    <div style={base.app}>
      <div style={base.container}>
        {screen === "home" && (
          <HomeView onNew={() => setScreen("create")} onImport={() => setScreen("import")} />
        )}
        {screen === "create" && (
          <CreateView
            onBack={() => setScreen("home")}
            onEnter={loadWallet}
            onGenerateMnemonic={props.onGenerateMnemonic}
          />
        )}
        {screen === "import" && (
          <ImportView
            onBack={() => setScreen("home")}
            onEnter={loadWallet}
            onValidateMnemonic={props.onValidateMnemonic}
          />
        )}
        {screen === "dashboard" && wallet && (
          <DashboardView
            address={wallet.address}
            balance={wallet.balance}
            txHistory={wallet.txHistory}
            onLogout={handleLogout}
            onRefreshBalance={props.onRefreshBalance}
            onSendTransaction={props.onSendTransaction}
          />
        )}
      </div>
    </div>
  );
}

export default WalletApp;
