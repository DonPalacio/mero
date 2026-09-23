import { useState } from 'react';
import { Categoria } from '../components/Budgets';

// La categoría ahora es opcional (?) para permitir movimientos libres
export interface Transaccion {
  id: string;
  tipo: 'ingreso' | 'gasto';
  monto: number;
  fecha: string; 
  categoria?: string; 
  medio: string;
}

const transaccionesDePrueba: Transaccion[] = [
  // Septiembre 2026
  { id: '1', tipo: 'ingreso', monto: 4500000, fecha: '2026-09-01', categoria: 'Salario', medio: 'Bancolombia' },
  { id: '2', tipo: 'gasto', monto: 500000, fecha: '2026-09-05', categoria: 'Deudas / Tarjetas de Crédito', medio: 'Nu' },
  { id: '3', tipo: 'gasto', monto: 300000, fecha: '2026-09-12', categoria: 'Servicios Públicos y Conectividad', medio: 'Efectivo' },
  { id: '4', tipo: 'gasto', monto: 150000, fecha: '2026-09-23', categoria: 'Supermercado', medio: 'Nu' },
  // Un movimiento sin categoría que solo afecta el saldo:
  { id: '99', tipo: 'gasto', monto: 50000, fecha: '2026-09-25', medio: 'Efectivo' }, 
  
  // Octubre 2026
  { id: '5', tipo: 'ingreso', monto: 4500000, fecha: '2026-10-01', categoria: 'Salario', medio: 'Bancolombia' },
  { id: '6', tipo: 'gasto', monto: 800000, fecha: '2026-10-05', categoria: 'Deudas / Tarjetas de Crédito', medio: 'Nu' },
  { id: '7', tipo: 'gasto', monto: 100000, fecha: '2026-10-15', categoria: 'Suscripciones', medio: 'Bancolombia' },
  
  // Agosto 2026
  { id: '8', tipo: 'ingreso', monto: 4200000, fecha: '2026-08-01', categoria: 'Salario', medio: 'Bancolombia' },
  { id: '9', tipo: 'gasto', monto: 200000, fecha: '2026-08-10', categoria: 'Transporte y Mantenimiento', medio: 'Efectivo' },
];

export function useDashboard() {
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  
  const [categorias, setCategorias] = useState<Categoria[]>([
    { name: "Suscripciones", tipo: "gasto", budget: 150000 },
    { name: "Transporte y Mantenimiento", tipo: "gasto", budget: 250000 },
    { name: "Deudas / Tarjetas de Crédito", tipo: "gasto", budget: 450000 },
    { name: "Supermercado", tipo: "gasto", budget: 800000 },
  ]);

  // --- CÁLCULOS DEL MES ACTUAL ---
  const transaccionesDelMes = transaccionesDePrueba.filter(t => t.fecha.startsWith(selectedMonth));

  const totalIngresos = transaccionesDelMes
    .filter(t => t.tipo === 'ingreso')
    .reduce((suma, t) => suma + t.monto, 0);

  const totalGastos = transaccionesDelMes
    .filter(t => t.tipo === 'gasto')
    .reduce((suma, t) => suma + t.monto, 0);

  const queda = totalIngresos - totalGastos;

  const gastosPorCajitaCalc: Record<string, number> = {};
  transaccionesDelMes
    .filter(t => t.tipo === 'gasto' && t.categoria) // Solo tomamos en cuenta los que tienen categoría
    .forEach(t => {
      gastosPorCajitaCalc[t.categoria!] = (gastosPorCajitaCalc[t.categoria!] || 0) + t.monto;
    });

  // --- CÁLCULO DE SALDOS POR MEDIO (Histórico Global) ---
  const saldosPorMedioCalc: Record<string, number> = {};
  
  transaccionesDePrueba.forEach(t => {
    // Si el medio no existe en nuestro registro, lo iniciamos en 0
    if (!saldosPorMedioCalc[t.medio]) {
      saldosPorMedioCalc[t.medio] = 0;
    }
    // Sumamos o restamos según el tipo, sin importar la categoría
    if (t.tipo === 'ingreso') {
      saldosPorMedioCalc[t.medio] += t.monto;
    } else if (t.tipo === 'gasto') {
      saldosPorMedioCalc[t.medio] -= t.monto;
    }
  });

  // Creamos el arreglo con los nombres de los medios para el componente Summary
  const listaMedios = Object.keys(saldosPorMedioCalc).map(name => ({ name }));

  // --- FUNCIONES ---
  const handleBudgetChange = (name: string, value: string) => {
    const newValue = parseInt(value) || 0;
    setCategorias(prevCategorias => 
      prevCategorias.map(cat => 
        cat.name === name ? { ...cat, budget: newValue } : cat
      )
    );
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2); 
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  return {
    gastosPorCajita: gastosPorCajitaCalc,
    categorias,
    selectedMonth,
    totalIngresos,
    totalGastos,
    queda,
    saldosPorMedio: saldosPorMedioCalc, // Exportamos los saldos calculados
    listaMedios,                        // Exportamos la lista de medios
    handleBudgetChange,
    handlePrevMonth,
    handleNextMonth
  };
}