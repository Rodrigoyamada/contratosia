import { useState, useEffect } from 'react';
import { useProcesses } from '../hooks/useProcesses';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Process } from '../types';

interface ProcessFormProps {
    initialData?: Process;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ProcessForm({ initialData, onSuccess, onCancel }: ProcessFormProps) {
    const { createProcess, updateProcess } = useProcesses();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        nup: '',
        contract_number: '',
        object_nature: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                nup: initialData.nup || '',
                contract_number: initialData.contract_number || '',
                object_nature: initialData.object_nature || '',
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
        if (formData.title.length > 30) newErrors.title = 'Título deve ter no máximo 30 caracteres';
        if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
        if (formData.description.length > 160) newErrors.description = 'Descrição deve ter no máximo 160 caracteres';
        if (!formData.object_nature) newErrors.object_nature = 'Natureza do objeto é obrigatória';
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        let result;

        if (initialData) {
            result = await updateProcess(initialData.id, formData);
        } else {
            result = await createProcess(formData);
        }

        setLoading(false);

        if (result.error) {
            console.error(result.error);
            alert('Erro ao salvar processo: ' + result.error);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                <Input
                    label="Título"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    error={errors.title}
                    helperText={`${formData.title.length}/30 caracteres`}
                    maxLength={30}
                    required
                />

                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Descrição
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className={`flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus-visible:ring-blue-500'
                            }`}
                        maxLength={160}
                        required
                    />
                    <div className="flex justify-between mt-1">
                        <p className="text-xs text-red-500">{errors.description}</p>
                        <p className="text-xs text-gray-500">{formData.description.length}/160 caracteres</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="NUP (Opcional)"
                        name="nup"
                        value={formData.nup}
                        onChange={handleChange}
                    />
                    <Input
                        label="Nº Contratação (Opcional)"
                        name="contract_number"
                        value={formData.contract_number}
                        onChange={handleChange}
                    />
                </div>

                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Natureza do Objeto *
                    </label>
                    <select
                        name="object_nature"
                        value={formData.object_nature}
                        onChange={handleChange}
                        className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.object_nature ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus-visible:ring-blue-500'}`}
                        required
                    >
                        <option value="" disabled>Selecione uma natureza</option>
                        <option value="Aquisições">Aquisições</option>
                        <option value="Serviços Comuns e Especializados">Serviços Comuns e Especializados</option>
                        <option value="Serviços com Mão de Obra Exclusiva">Serviços com Mão de Obra Exclusiva</option>
                        <option value="Obras">Obras</option>
                        <option value="Serviços de Engenharia">Serviços de Engenharia</option>
                        <option value="Soluções de TIC">Soluções de TIC</option>
                    </select>
                    {errors.object_nature && (
                        <p className="mt-1 text-xs text-red-500">{errors.object_nature}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" loading={loading}>
                    {initialData ? 'Salvar Alterações' : 'Criar Processo'}
                </Button>
            </div>
        </form>
    );
}
