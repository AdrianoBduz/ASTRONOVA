export interface UserProfile {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  // depthPreference removido, pois agora é sempre 'completo'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface MoonData {
  sign: string;
  zodiacIndex: number; // 0 for Aries, 1 for Taurus, etc.
  phase: string;
  description: string;
}

export interface ElementalBalance {
  fogo: number;
  terra: number;
  ar: number;
  agua: number;
  elemento_dominante: string;
}

export interface FullAnalysisData {
  resumo_geral: {
    saudacao: string;
    arquetipo_principal: string; // Ex: "O Guerreiro Filósofo"
    frase_poder: string;
    introducao_longa: string; // Nova introdução detalhada
  };
  balanco_elemental: ElementalBalance;
  mapa_astral: {
    sol: { signo: string; grau: string; casa: string; interpretacao: string };
    lua: { signo: string; fase: string; casa: string; interpretacao: string };
    ascendente: { signo: string; interpretacao: string };
    descendente: { signo: string; interpretacao: string }; // Novo
    meio_do_ceu: { signo: string; interpretacao: string }; // Novo
    planetas_pessoais: {
        mercurio: string;
        venus: string;
        marte: string;
    };
    planetas_sociais: {
        jupiter: string;
        saturno: string;
    };
    planetas_transpessoais: {
        urano: string;
        netuno: string;
        plutao: string;
    };
  };
  numerologia: {
    numero_destino: number;
    numero_alma: number;
    interpretacao_completa: string; // Texto longo
  };
  insights_praticos: {
    cor_favoravel: string;
    cristal_poder: string;
    desafio_atual: string;
    missao_alma: string; // Novo
  };
  interacao_ia_chat: {
    sugestoes_avancadas: string[];
  };
}

export enum AstrologyTopic {
  GENERAL = 'Geral',
  CHART = 'Mapa Astral',
  LOVE = 'Sinastria & Amor',
  FORECAST = 'Trânsitos Atuais',
  CAREER = 'Vocação & Finanças'
}