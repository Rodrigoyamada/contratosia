export type UserRole = 'admin' | 'user';

export interface Profile {
    id: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

export interface Process {
    id: string;
    title: string;
    description: string;
    nup?: string;
    contract_number?: string;
    object_nature?: string;
    status: 'rascunho' | 'em_andamento' | 'concluido';
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface Document {
    id: string;
    process_id: string;
    type: 'DFD' | 'TR' | 'ETP' | 'Matriz de Risco';
    title: string;
    demand_text?: string;
    generated_text?: string;
    estimated_value?: number;
    status: 'draft' | 'processing' | 'completed';
    order_index: number;
    created_at: string;
    updated_at: string;
}
