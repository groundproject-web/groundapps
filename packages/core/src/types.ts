/**
 * Gramática do traço: o estado de todo dado ou insight exibido.
 * É um campo do dado, não só um estilo visual.
 */
export const STATUSES = ["fato", "hipotese", "gargalo", "sem_info"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  fato: "Fato",
  hipotese: "Hipótese",
  gargalo: "Gargalo",
  sem_info: "Sem informação",
};

export const STATUS_HINT: Record<Status, string> = {
  fato: "Confirmado pelos dados",
  hipotese: "Ainda pode mudar",
  gargalo: "Onde o crescimento trava",
  sem_info: "Sem informação suficiente",
};

export type ModuleKey = "marco_zero" | "sketch";

/** Valores em centavos (inteiros) para evitar erro de ponto flutuante. */
export type Cents = number;

export interface OrderItem {
  product: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  totalCents: Cents;
  items?: OrderItem[];
  coupon?: string | null;
  /** Código de origem (UTM, indicação, QR, "como conheceu") */
  sourceCode?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface Dataset {
  customers: Customer[];
  orders: Order[];
}
