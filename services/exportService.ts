export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function printSession() {
  window.print();
}