import { vi } from "vitest";

export const mockConfig = {
    workerId: 1,
    port: 3000,
    nodeEnv: "test",
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    redisUrl: "redis://localhost:6379",
    redisTtl: 3600,
    datacenterId: 0,
};

vi.mock("@/config", () => ({
    config: mockConfig,
}));
