export const EXTRA_TYPES = [
  "Deslocação",
  "Estadia",
  "Hora Extra",
  "Pack Analógico Foto",
  "Pack Analógico Video Super8",
  "Sessão de Noivos",
  "Pre-Wedding",
  "Álbum Grande",
  "Álbum Médio",
  "Álbum Pequeno",
  "Álbum Best Of",
  "WoodBox",
  "Outro",
] as const;

export type ExtraType = (typeof EXTRA_TYPES)[number];

export const EXTRA_DEFAULT_PRICE: Record<ExtraType, number> = {
  "Deslocação": 0.4,
  "Estadia": 175,
  "Hora Extra": 150,
  "Pack Analógico Foto": 2500,
  "Pack Analógico Video Super8": 1500,
  "Sessão de Noivos": 600,
  "Pre-Wedding": 600,
  "Álbum Grande": 370,
  "Álbum Médio": 310,
  "Álbum Pequeno": 270,
  "Álbum Best Of": 190,
  "WoodBox": 150,
  "Outro": 0,
};

export const EXTRA_UNIT_LABEL: Partial<Record<ExtraType, string>> = {
  "Deslocação": "km",
  "Hora Extra": "h",
};
