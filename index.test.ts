import { readFullBody, bodyHash } from ".";
import { EventEmitter } from "events";
import { IncomingMessage } from "http";

describe("read body", () => {
  it("should parse full body", () => {
    const body = new EventEmitter() as IncomingMessage;
    const parsedPromise = readFullBody(body);
    body.emit("data", Buffer.from("hello", "utf8"));
    body.emit("data", Buffer.from(" something", "utf8"));
    body.emit("end");

    return parsedPromise.then(parsed => {
      expect(parsed.toString()).toBe("hello something");
    });
  });
});

describe("body hash", () => {
  it("should work", () => {
    const hash = bodyHash(Buffer.from("body", "utf8"), "secret");
    expect(hash).toBe("sha1=a18991ff7e4513a1c2d2ee51e3a8e99ca891d9cd");
  });
});
