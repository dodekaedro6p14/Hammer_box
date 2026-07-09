# servidor.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class SecurityHeadersHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # COMENTARIO RELEVANTE: Estos dos encabezados habilitan de forma obligatoria el aislamiento
        # de origen cruzado para permitir el uso de SharedArrayBuffer por parte de FFmpeg.wasm
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

if __name__ == '__main__':
    port = 8080
    print(f"Servidor de desarrollo activo en: http://localhost:{port}")
    # Iniciamos el servidor HTTP local
    server = HTTPServer(('localhost', port), SecurityHeadersHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        sys.exit(0)