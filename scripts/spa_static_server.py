#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
from functools import partial


class SpaRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)

        if os.path.isdir(path):
            for index_name in ("index.html", "index.htm"):
                index_path = os.path.join(path, index_name)
                if os.path.exists(index_path):
                    self.path = os.path.join(self.path.rstrip("/"), index_name)
                    return http.server.SimpleHTTPRequestHandler.send_head(self)

        if os.path.exists(path):
            return http.server.SimpleHTTPRequestHandler.send_head(self)

        self.path = "/index.html"
        return http.server.SimpleHTTPRequestHandler.send_head(self)


def main():
    parser = argparse.ArgumentParser(description="Serve a static SPA with index fallback.")
    parser.add_argument("--directory", default="dist", help="Directory to serve")
    parser.add_argument("--port", type=int, default=8081, help="Port to bind")
    args = parser.parse_args()

    handler_class = partial(SpaRequestHandler, directory=args.directory)

    with socketserver.TCPServer(("", args.port), handler_class) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
