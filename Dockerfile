FROM denoland/deno:2.1.9

# The port that your application listens to.
EXPOSE 3232

WORKDIR /app

VOLUME /data

USER deno

RUN deno install

COPY . .
RUN deno cache main.ts

CMD ["run", "--allow-env", "--allow-net", "--allow-read", "--allow-ffi", "main.ts"]
