import { Terminal } from "./vendor/xterm/xterm.mjs";
import { FitAddon } from "./vendor/xterm/addon-fit.mjs";

const prompt = "\x1b[1;36msonicblast\x1b[0m \x1b[90m›\x1b[0m ";

export class SonicTerminal {
  constructor({ container, onCommand }) {
    this.container = container;
    this.onCommand = onCommand;
    this.line = "";
    this.ready = false;
    this.busy = false;
  }

  start() {
    if (this.ready) return;
    this.term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 12,
      lineHeight: 1.35,
      scrollback: 1_000,
      theme: { background: "#0b1525", foreground: "#dbeafe", cursor: "#69f0b0", selectionBackground: "#1e4b70", black: "#0b1525", brightBlack: "#6d8ba8", green: "#69f0b0", brightGreen: "#a4ffcf", cyan: "#75d8ff", brightCyan: "#b6ecff", yellow: "#ffd166", brightYellow: "#ffe09b", red: "#ff8b8b", brightRed: "#ffbbbb", white: "#dbeafe", brightWhite: "#ffffff" }
    });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.container);
    this.fit();
    this.term.writeln("\x1b[1;32mSonicBlast browser network console\x1b[0m");
    this.term.writeln("Type \x1b[1;36mhelp\x1b[0m for direct wallet scripts. This console never runs a server shell or calls a quote API.");
    this.newPrompt();
    this.term.onData((data) => this.handleData(data));
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this.container);
    this.ready = true;
  }

  fit() {
    try { this.fitAddon?.fit(); } catch { /* A hidden console will fit when shown. */ }
  }

  focus() {
    this.start();
    requestAnimationFrame(() => { this.fit(); this.term.focus(); });
  }

  write(message = "") {
    this.start();
    this.term.writeln(String(message));
  }

  info(message) { this.write(`\x1b[36m›\x1b[0m ${message}`); }
  success(message) { this.write(`\x1b[32m✓\x1b[0m ${message}`); }
  warn(message) { this.write(`\x1b[33m!\x1b[0m ${message}`); }
  error(message) { this.write(`\x1b[31m×\x1b[0m ${message}`); }

  clear() {
    this.term.clear();
    this.term.writeln("\x1b[1;32mSonicBlast browser network console\x1b[0m");
    this.newPrompt();
  }

  newPrompt() {
    this.line = "";
    this.term.write(prompt);
  }

  async submit() {
    const line = this.line.trim();
    this.term.write("\r\n");
    this.line = "";
    if (!line) return this.newPrompt();
    const [command, ...args] = line.split(/\s+/);
    if (command.toLowerCase() === "clear") return this.clear();
    if (this.busy) {
      this.warn("An approved action is already waiting for your wallet.");
      return this.newPrompt();
    }
    this.busy = true;
    try {
      await this.onCommand(command.toLowerCase(), args, this);
    } catch (error) {
      this.error(error?.message || "Action could not be completed.");
    } finally {
      this.busy = false;
      this.newPrompt();
    }
  }

  handleData(data) {
    if (this.busy) return;
    if (data === "\r") return void this.submit();
    if (data === "\u0003") {
      this.term.write("^C\r\n");
      return this.newPrompt();
    }
    if (data === "\u007f") {
      if (this.line.length) {
        this.line = this.line.slice(0, -1);
        this.term.write("\b \b");
      }
      return;
    }
    if (/^[\x20-\x7e]+$/.test(data) && this.line.length + data.length <= 180) {
      this.line += data;
      this.term.write(data);
    }
  }
}

export const terminalHelp = [
  "\x1b[1;36mhelp\x1b[0m                         show approved actions",
  "\x1b[1;36mstatus\x1b[0m                       show wallet and launch state",
  "\x1b[1;36mconnect\x1b[0m                      connect the selected wallet",
  "\x1b[1;36mscript deploy\x1b[0m                preview the local deployment script",
  "\x1b[1;36mscript pair <token> [quote]\x1b[0m   preview the local liquidity script",
  "\x1b[1;36mdeploy\x1b[0m                       deploy the reviewed EVM token",
  "\x1b[1;36mpair <tokenAmount> [quoteAmount]\x1b[0m  approve and add V2 liquidity",
  "\x1b[1;36mclear\x1b[0m                        clear this screen"
];
