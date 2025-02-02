FROM denoland/deno:2.1.9

# The port that your application listens to.
EXPOSE 3232

WORKDIR /app

RUN deno install

COPY . .
RUN deno cache main.ts

CMD ["run", "--allow-env", "--allow-net", "--allow-read", "--allow-write", "--allow-ffi", "main.ts"]
