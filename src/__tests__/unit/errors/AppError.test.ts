import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  CacheError,
  SystemClockError,
} from "@/errors/AppError";

describe("AppError", () => {
  it("should create base error with provided values", () => {
    const error = new AppError("Base error", 418, false);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Base error");
    expect(error.statusCode).toBe(418);
    expect(error.isOperational).toBe(false);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });

  it("should create ValidationError with 400 status", () => {
    const error = new ValidationError("Invalid input");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });

  it("should create NotFoundError with 404 status", () => {
    const error = new NotFoundError("Missing resource");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });

  it("should create DatabaseError with 500 status", () => {
    const error = new DatabaseError("DB failed", true);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });

  it("should create CacheError with 500 status and non-operational by default", () => {
    const error = new CacheError("Cache down");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(CacheError);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });

  it("should create SystemClockError with 500 status and non-operational by default", () => {
    const error = new SystemClockError("Clock drift");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(SystemClockError);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);

    expect({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }).toMatchSnapshot();
  });
});