module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["@swc/jest", { jsc: { target: "es2022" } }],
  },
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/lambda.ts", "!src/services/config.service.ts"],
  coverageThreshold: {
    global: {
      branches: 85,
      lines: 85,
    },
  },
};
