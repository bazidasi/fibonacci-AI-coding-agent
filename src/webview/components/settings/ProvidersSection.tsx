import React, { useState, useEffect } from 'react';
import type { AgentConfig, ProviderConfig } from '@shared/index';
import { postMessage as postToHost } from '../../vscodeApi';
import { Section, SettingRow, Toggle, MaskedInput, TextInput, Button, StatusDot, EmptyState, SectionHeader } from './ui';

interface PredefinedProvider {
  id: string;
  name: string;
  baseURL: string;
  icon: React.ReactNode;
  models: { id: string; label: string; description: string; outputCost: number }[];
}

const PREDEFINED_PROVIDERS: PredefinedProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v3.005l-2.607 1.5-2.602-1.5z" />
      </svg>
    ),
    models: [
      { id: 'gpt-5.6', label: 'GPT-5.6', description: 'Most capable model', outputCost: 15 },
      { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', description: 'Luna variant', outputCost: 15 },
      { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', description: 'Sol variant', outputCost: 15 },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', description: 'Terra variant', outputCost: 15 },
      { id: 'gpt-5.5', label: 'GPT-5.5', description: 'Previous generation', outputCost: 12 },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', description: 'Fast and efficient', outputCost: 5 },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', description: 'Ultra lightweight', outputCost: 1 },
      { id: 'gpt-5.2-pro', label: 'GPT-5.2 Pro', description: 'Pro reasoning', outputCost: 20 },
      { id: 'gpt-5.2', label: 'GPT-5.2', description: 'Balanced model', outputCost: 10 },
      { id: 'gpt-5.1', label: 'GPT-5.1', description: 'Fast model', outputCost: 5 },
      { id: 'gpt-5.1-codex', label: 'GPT-5.1 Codex', description: 'Code generation', outputCost: 8 },
      { id: 'gpt-5', label: 'GPT-5', description: 'Base model', outputCost: 8 },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Compact model', outputCost: 3 },
      { id: 'gpt-4.1', label: 'GPT-4.1', description: 'Previous gen', outputCost: 10 },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast previous gen', outputCost: 3 },
      { id: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal', outputCost: 10 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast multimodal', outputCost: 1.5 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.74 20.48h-3.674l-1.632-4.317h-6.46l-1.59 4.317H0L6.57 3.52zm1.07 6.525l-2.163 5.654h4.353l-2.19-5.654z" />
      </svg>
    ),
    models: [
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', description: 'Latest Sonnet', outputCost: 15 },
      { id: 'claude-fable-5', label: 'Claude Fable 5', description: 'Creative model', outputCost: 15 },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', description: 'Most capable', outputCost: 75 },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', description: 'Previous Opus', outputCost: 75 },
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Advanced reasoning', outputCost: 75 },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Balanced model', outputCost: 15 },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', description: 'Previous gen', outputCost: 75 },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: 'Fast and capable', outputCost: 15 },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fast and affordable', outputCost: 1.25 },
      { id: 'claude-opus-4-1', label: 'Claude Opus 4.1', description: 'Legacy Opus', outputCost: 75 },
      { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4.0', description: 'Legacy Sonnet', outputCost: 15 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    models: [
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', description: 'Latest preview', outputCost: 15 },
      { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', description: 'Previous preview', outputCost: 12 },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable stable', outputCost: 10 },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast and efficient', outputCost: 1.5 },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    baseURL: 'https://api.x.ai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13.5 2C13.5 2 14.5 2 15 3L18 8L21 13C21.5 14 21 15 20 15.5L16 17.5L14 22C13.5 23 12.5 23 12 22L8 13L4 17L2 20C1.5 21 0.5 21 0 20L2 15L6 8L10 3C10.5 2 11.5 2 12 3L13.5 2Z" />
      </svg>
    ),
    models: [
      { id: 'grok-4.5', label: 'Grok 4.5', description: 'Latest Grok', outputCost: 15 },
      { id: 'grok-4-fast-reasoning', label: 'Grok 4 Fast Reasoning', description: 'Fast reasoning', outputCost: 12 },
      { id: 'grok-4', label: 'Grok 4', description: 'Previous gen', outputCost: 10 },
      { id: 'grok-3', label: 'Grok 3', description: 'Balanced model', outputCost: 8 },
      { id: 'grok-3-mini', label: 'Grok 3 Mini', description: 'Fast and affordable', outputCost: 3 },
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    baseURL: 'https://api.vercel.ai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2L2 22h20L12 2z" />
      </svg>
    ),
    models: [
      { id: 'v0-1.0-md', label: 'v0 1.0 MD', description: 'Vercel AI model', outputCost: 10 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseURL: 'https://api.mistral.ai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M4 3h4v18H4V3zm6.5 0H14v18h-3.5V3zM16 3h4v18h-4V3z" />
      </svg>
    ),
    models: [
      { id: 'pixtral-large-latest', label: 'Pixtral Large', description: 'Multimodal model', outputCost: 8 },
      { id: 'mistral-large-latest', label: 'Mistral Large', description: 'Most capable Mistral', outputCost: 6 },
      { id: 'magistral-medium-2506', label: 'Magistral Medium', description: 'Balanced model', outputCost: 4 },
      { id: 'magistral-small-2506', label: 'Magistral Small', description: 'Fast and efficient', outputCost: 1 },
      { id: 'mistral-small-latest', label: 'Mistral Small', description: 'Previous gen', outputCost: 1 },
      { id: 'ministral-8b-latest', label: 'Ministral 8B', description: 'Lightweight model', outputCost: 0.5 },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.5 18.5v-3h-3v-3h3v-3h3v3h3v3h-3v3h-3z" />
      </svg>
    ),
    models: [
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', description: 'Latest Llama', outputCost: 0.59 },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', description: 'Fast inference', outputCost: 0.59 },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill', description: 'Reasoning model', outputCost: 0.88 },
      { id: 'qwen-qwq-32b', label: 'Qwen QwQ 32B', description: 'Alibaba model', outputCost: 0.5 },
      { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', description: 'Open source GPT', outputCost: 1 },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    baseURL: 'https://api.cohere.com/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
    models: [
      { id: 'command-a-03-2025', label: 'Command A', description: 'Latest Command', outputCost: 5 },
      { id: 'command-a-reasoning-08-2025', label: 'Command A Reasoning', description: 'Reasoning model', outputCost: 6 },
      { id: 'command-r-plus', label: 'Command R+', description: 'Advanced model', outputCost: 4 },
      { id: 'command-r', label: 'Command R', description: 'Balanced model', outputCost: 2 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" />
      </svg>
    ),
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3', description: 'General purpose', outputCost: 1.1 },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1', description: 'Advanced reasoning', outputCost: 5.5 },
    ],
  },
  {
    id: 'moonshotai',
    name: 'Moonshot AI',
    baseURL: 'https://api.moonshot.ai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    models: [
      { id: 'kimi-k2.5', label: 'Kimi K2.5', description: 'Latest Kimi', outputCost: 8 },
      { id: 'kimi-k3', label: 'Kimi K3', description: 'Next gen Kimi', outputCost: 10 },
      { id: 'kimi-k2-thinking', label: 'Kimi K2 Thinking', description: 'Reasoning model', outputCost: 6 },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    baseURL: 'https://api.together.xyz/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    models: [
      { id: 'meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', description: 'Fast and capable', outputCost: 0.88 },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen2.5 72B Turbo', description: 'Alibaba model', outputCost: 1.2 },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', description: 'General purpose', outputCost: 1.5 },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B', description: 'Mixture of experts', outputCost: 1.2 },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2L8 8l-6 2 6 2 4 6 4-6 6-2-6-2-4-6z" />
      </svg>
    ),
    models: [
      { id: 'accounts/fireworks/models/deepseek-r1', label: 'DeepSeek R1', description: 'Reasoning model', outputCost: 3 },
      { id: 'accounts/fireworks/models/deepseek-v3', label: 'DeepSeek V3', description: 'General purpose', outputCost: 1.5 },
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'Llama 3.3 70B', description: 'Meta model', outputCost: 0.9 },
      { id: 'accounts/fireworks/models/qwen2-vl-72b-instruct', label: 'Qwen2 VL 72B', description: 'Multimodal', outputCost: 1.2 },
    ],
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 12h10M12 7v10" />
      </svg>
    ),
    models: [
      { id: 'qwen3-max', label: 'Qwen3 Max', description: 'Most capable', outputCost: 8 },
      { id: 'qwen-plus', label: 'Qwen Plus', description: 'Balanced model', outputCost: 4 },
    ],
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseURL: 'https://api.deepinfra.com/v1/openai',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12h8" />
      </svg>
    ),
    models: [
      { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick 17B', description: 'Latest Llama', outputCost: 0.8 },
      { id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', label: 'Llama 4 Scout 17B', description: 'Fast Llama', outputCost: 0.6 },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', description: 'Previous gen', outputCost: 0.9 },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', description: 'General purpose', outputCost: 1.5 },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', description: 'Reasoning model', outputCost: 5 },
      { id: 'Qwen/QwQ-32B', label: 'Qwen QwQ 32B', description: 'Alibaba model', outputCost: 0.5 },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseURL: 'https://api.cerebras.ai/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 8h8v8H8z" />
      </svg>
    ),
    models: [
      { id: 'llama3.3-70b', label: 'Llama 3.3 70B', description: 'Fast inference', outputCost: 0.6 },
      { id: 'gpt-oss-120b', label: 'GPT OSS 120B', description: 'Open source GPT', outputCost: 1.2 },
      { id: 'qwen-3-32b', label: 'Qwen 3 32B', description: 'Alibaba model', outputCost: 0.5 },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    baseURL: 'https://api-inference.huggingface.co/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-6h4v2h-4v-2z" />
      </svg>
    ),
    models: [
      { id: 'meta-llama/Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', description: 'Lightweight Llama', outputCost: 0.3 },
      { id: 'moonshotai/Kimi-K2-Instruct', label: 'Kimi K2 Instruct', description: 'Moonshot model', outputCost: 0.8 },
    ],
  },
  {
    id: 'baseten',
    name: 'Baseten',
    baseURL: 'https://api.baseten.co/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>
    ),
    models: [
      { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', label: 'Qwen3 235B', description: 'Large MoE model', outputCost: 2 },
      { id: 'deepseek-ai/DeepSeek-V3.1', label: 'DeepSeek V3.1', description: 'Latest DeepSeek', outputCost: 1.5 },
      { id: 'moonshotai/Kimi-K2-Instruct-0905', label: 'Kimi K2 Instruct', description: 'Moonshot model', outputCost: 1 },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.527 0H7.009v5.844h5.518c-.146.878-.559 1.976-1.579 2.794 1.026.628 2.439.994 3.733.994 2.857 0 5.26-1.737 6.236-4.208l-2.634-2.024C17.923 4.967 15.428 6.16 12.527 6.16c-3.621 0-6.56-2.95-6.56-6.593S8.906-7.026 12.527-7.026c1.78 0 3.26.65 4.4 1.72l2.33-2.33C17.63-9.56 15.3-10.5 12.527-10.5c-5.478 0-9.927 4.449-9.927 9.927S7.05 9.354 12.527 9.354c2.484 0 4.22-.835 5.578-2.254 1.07-1.12 1.42-2.742 1.42-4.125 0-.39-.051-.85-.136-1.27H12.527V0z" />
        <path d="M22.453 5.42h-2.178v6.716h2.178V5.42z" />
        <path d="M15.557 5.42h-2.178v6.716h2.178V5.42z" />
      </svg>
    ),
    models: [
      { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', description: 'Meta Llama 3.3 70B Instruct', outputCost: 0.88 },
      { id: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', description: 'Meta Llama 3.1 405B Instruct', outputCost: 6 },
      { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', description: 'DeepSeek R1 reasoning model', outputCost: 8 },
      { id: 'qwen/qwen3-235b-a22b', label: 'Qwen3 235B', description: 'Alibaba Qwen3 MoE model', outputCost: 1.5 },
    ],
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    baseURL: 'https://my.fibonacci.monster/api/v1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    models: [
      { id: 'fibonacci-1-pro-max', label: 'Fibonacci 1 Pro Max', description: 'Economy model', outputCost: 1 },
      { id: 'fibonacci-2-coder', label: 'Fibonacci 2 Coder', description: 'Code generation', outputCost: 2 },
      { id: 'fibonacci-1-agentic', label: 'Fibonacci 1 Agentic', description: 'Professional agentic model', outputCost: 7 },
    ],
  },
];

export const ProvidersSection: React.FC<{
  config: AgentConfig;
  providers: ProviderConfig[];
  onProvidersChange: (v: ProviderConfig[]) => void;
  t: (k: string) => string;
}> = ({ config, providers, onProvidersChange, t }) => {
  const [connectModal, setConnectModal] = useState<PredefinedProvider | null>(null);
  const [customModal, setCustomModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<ProviderConfig>({
    id: '', name: '', baseURL: '', apiKey: '', models: [], enabled: true,
  });
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { providerId, ok, error } = e.detail;
      setTestResults((prev) => ({ ...prev, [providerId]: { ok, error } }));
    };
    window.addEventListener('PROVIDER_TEST_RESULT', handler as EventListener);
    return () => window.removeEventListener('PROVIDER_TEST_RESULT', handler as EventListener);
  }, []);

  const isConnected = (providerId: string) => providers.some((p) => p.id === providerId && p.enabled);

  const connectProvider = (provider: PredefinedProvider, apiKey: string) => {
    const existing = providers.find((p) => p.id === provider.id);
    if (existing) {
      onProvidersChange(providers.map((p) => p.id === provider.id ? { ...p, apiKey, enabled: true } : p));
    } else {
      onProvidersChange([...providers, {
        id: provider.id,
        name: provider.name,
        baseURL: provider.baseURL,
        apiKey,
        models: provider.models,
        enabled: true,
      }]);
    }
    setConnectModal(null);
  };

  const disconnectProvider = (id: string) => {
    onProvidersChange(providers.map((p) => p.id === id ? { ...p, enabled: false } : p));
  };

  const reconnectProvider = (id: string) => {
    onProvidersChange(providers.map((p) => p.id === id ? { ...p, enabled: true } : p));
  };

  const removeProvider = (id: string) => {
    onProvidersChange(providers.filter((p) => p.id !== id));
  };

  const addCustomProvider = () => {
    if (!newProvider.name || !newProvider.baseURL) return;
    const id = newProvider.name.toLowerCase().replace(/\s+/g, '-');
    onProvidersChange([...providers, { ...newProvider, id }]);
    setNewProvider({ id: '', name: '', baseURL: '', apiKey: '', models: [], enabled: true });
    setCustomModal(false);
  };

  const startEdit = (p: ProviderConfig) => {
    setEditingId(p.id);
    setNewProvider({ ...p });
  };

  const saveEdit = () => {
    if (!newProvider.name || !newProvider.baseURL) return;
    onProvidersChange(providers.map((p) => p.id === editingId ? { ...newProvider } : p));
    setEditingId(null);
    setNewProvider({ id: '', name: '', baseURL: '', apiKey: '', models: [], enabled: true });
  };

  const testConnection = (id: string) => {
    postToHost({ type: 'TEST_PROVIDER_CONNECTION', providerId: id });
  };

  return (
    <div className="space-y-6">
      {/* Connected providers */}
      {providers.filter((p) => p.enabled).length > 0 && (
        <Section title={t('providers.connected') || 'Connected'}>
          <div className="space-y-2">
            {providers.filter((p) => p.enabled).map((p) => {
              const test = testResults[p.id];
              const predefined = PREDEFINED_PROVIDERS.find((pp) => pp.id === p.id);
              return (
                <div key={p.id} className="border border-status-success/30 rounded-card bg-input overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-status-success/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-elevated-2 flex items-center justify-center text-status-success">
                        {predefined?.icon || (
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-13zm13-1H1.5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 14.5 1z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-text-primary">{p.name}</span>
                          <StatusDot ok={true} />
                        </div>
                        <div className="text-2xs text-text-muted truncate" dir="ltr">{p.baseURL}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      <Button onClick={() => testConnection(p.id)}>{t('providers.test')}</Button>
                      <Button onClick={() => startEdit(p)}>{t('common.edit') || 'Edit'}</Button>
                      <Button variant="danger" onClick={() => disconnectProvider(p.id)}>
                        {t('providers.disconnect') || 'Disconnect'}
                      </Button>
                    </div>
                  </div>
                  {p.models.length > 0 && (
                    <div className="px-3 py-2 text-2xs text-text-muted border-t border-border-subtle">
                      {p.models.map((m) => m.label).join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Available providers */}
      <Section title={t('providers.available') || 'Available Providers'}>
        <div className="grid grid-cols-1 gap-2">
          {PREDEFINED_PROVIDERS.map((provider) => {
            const connected = isConnected(provider.id);
            const test = testResults[provider.id];
            return (
              <div key={provider.id} className={`border rounded-card bg-input overflow-hidden transition-colors duration-fast ${
                connected ? 'border-status-success/30' : 'border-border-subtle hover:border-border-input'
              }`}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      connected ? 'bg-status-success/10 text-status-success' : 'bg-elevated-2 text-text-secondary'
                    }`}>
                      {provider.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm text-text-primary">{provider.name}</span>
                      <div className="text-2xs text-text-muted">{provider.models.length} {t('providers.models') || 'models'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 items-center">
                    {connected ? (
                      <>
                        <StatusDot ok={true} />
                        <span className="text-2xs text-status-success">{t('providers.connected') || 'Connected'}</span>
                      </>
                    ) : (
                      <Button variant="primary" onClick={() => setConnectModal(provider)}>
                        + {t('providers.connect') || 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
                {connected && (
                  <div className="px-3 py-1.5 text-2xs text-text-muted border-t border-border-subtle bg-elevated-2/30">
                    {provider.models.map((m) => m.label).join(' · ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Custom provider */}
      <Section title={t('providers.custom') || 'Custom Provider'}>
        <Button variant="secondary" onClick={() => setCustomModal(true)} className="w-full">
          + {t('providers.addCustom') || 'Add Custom Provider'}
        </Button>
      </Section>

      {/* Connect Modal */}
      {connectModal && (
        <ConnectModal
          provider={connectModal}
          onConnect={(apiKey) => connectProvider(connectModal, apiKey)}
          onClose={() => setConnectModal(null)}
          t={t}
        />
      )}

      {/* Custom Provider Modal */}
      {customModal && (
        <CustomProviderModal
          provider={newProvider}
          onChange={setNewProvider}
          onConnect={addCustomProvider}
          onClose={() => setCustomModal(false)}
          t={t}
        />
      )}

      {/* Edit Modal */}
      {editingId && (
        <CustomProviderModal
          provider={newProvider}
          onChange={setNewProvider}
          onConnect={saveEdit}
          onClose={() => { setEditingId(null); setNewProvider({ id: '', name: '', baseURL: '', apiKey: '', models: [], enabled: true }); }}
          t={t}
          isEdit
        />
      )}
    </div>
  );
};

/* ── Connect Modal ── */
const ConnectModal: React.FC<{
  provider: PredefinedProvider;
  onConnect: (apiKey: string) => void;
  onClose: () => void;
  t: (k: string) => string;
}> = ({ provider, onConnect, onClose, t }) => {
  const [apiKey, setApiKey] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-panel border border-border-subtle rounded-card shadow-lg w-96 max-w-[90vw] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-elevated-2 flex items-center justify-center text-brand">
              {provider.icon}
            </div>
            <div>
              <h3 className="font-medium text-sm text-text-primary">{provider.name}</h3>
              <p className="text-2xs text-text-muted">{t('providers.connectTo') || 'Connect to'} {provider.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1.5">{t('settings.apiKey') || 'API Key'}</label>
            <MaskedInput
              value={apiKey}
              onChange={setApiKey}
              placeholder={`Enter your ${provider.name} API key`}
            />
          </div>
          <div className="text-2xs text-text-muted">
            <div className="font-medium text-text-secondary mb-1">{t('providers.includedModels') || 'Included models'}:</div>
            <div className="flex flex-wrap gap-1">
              {provider.models.map((m) => (
                <span key={m.id} className="px-1.5 py-0.5 bg-elevated-2 rounded text-text-tertiary">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-border-subtle">
          <Button onClick={onClose} className="flex-1">{t('common.cancel') || 'Cancel'}</Button>
          <Button variant="primary" onClick={() => onConnect(apiKey)} disabled={!apiKey.trim()} className="flex-1">
            {t('providers.connect') || 'Connect'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ── Custom Provider Modal ── */
const CustomProviderModal: React.FC<{
  provider: ProviderConfig;
  onChange: (p: ProviderConfig) => void;
  onConnect: () => void;
  onClose: () => void;
  t: (k: string) => string;
  isEdit?: boolean;
}> = ({ provider, onChange, onConnect, onClose, t, isEdit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-panel border border-border-subtle rounded-card shadow-lg w-96 max-w-[90vw] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 className="font-medium text-sm text-text-primary">
            {isEdit ? (t('common.edit') || 'Edit') : (t('providers.addCustom') || 'Add Custom Provider')}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">{t('providers.name') || 'Name'}</label>
            <TextInput
              value={provider.name}
              onChange={(v) => onChange({ ...provider, name: v })}
              placeholder="My Provider"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Base URL</label>
            <TextInput
              value={provider.baseURL}
              onChange={(v) => onChange({ ...provider, baseURL: v })}
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">{t('settings.apiKey') || 'API Key'}</label>
            <MaskedInput
              value={provider.apiKey}
              onChange={(v) => onChange({ ...provider, apiKey: v })}
              placeholder="sk-..."
            />
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-border-subtle">
          <Button onClick={onClose} className="flex-1">{t('common.cancel') || 'Cancel'}</Button>
          <Button variant="primary" onClick={onConnect} disabled={!provider.name || !provider.baseURL} className="flex-1">
            {isEdit ? (t('common.save') || 'Save') : (t('providers.connect') || 'Connect')}
          </Button>
        </div>
      </div>
    </div>
  );
};
