import { stringify } from "querystring";
import { useState } from "react";

export interface CategoriaBase {
  name: string;
  tipo: "gasto" | "ingreso";
}

export interface Movimiento {
  id: string;
  tipo: "gasto" | "ingreso";
  monto: number;
  cajita: string;
  medio: string;
  fecha: string;
  nota: string;
}

export function useTransactions() {
  const mediosDisponibles = ["Efectivo", "Nu", "Bancolombia"];
  const categoriasDisponibles: CategoriaBase[] = [
    { name: "Salario", tipo: "ingreso" },
    { name: "Suscripciones", tipo: "gasto" },
    { name: "Transporte", tipo: "gasto" },
    { name: "Supermercado", tipo: "gasto" },
  ];

  const [movimientos, setMovimientos] = useState<Movimiento[]>([
    {
      id: "1",
      tipo: "gasto",
      monto: 150000,
      cajita: "Supermercado",
      medio: "Nu",
      fecha: new Date().toISOString().split("T")[0] as string,
      nota: "Mercado quincena",
    },
    {
      id: "2",
      tipo: "ingreso",
      monto: 2500000,
      cajita: "Salario",
      medio: "Bancolombia",
      fecha: new Date().toISOString().split("T")[0] as string,
      nota: "Pago nómina",
    },
  ]);

  const [tipoSel, setTipoSel] = useState<"gasto" | "ingreso">("gasto");
  const [monto, setMonto] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedMedio, setSelectedMedio] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0] as string);
  const [nota, setNota] = useState("");
  const [fMsg, setFMsg] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  const categoriasFiltradas = categoriasDisponibles.filter((c) => c.tipo === tipoSel);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = parseFloat(monto);

    if (!montoNum || montoNum <= 0) {
      setFMsg("Ingresa un monto válido mayor a 0");
      return;
    }
    if (!selectedCat) {
      setFMsg("Selecciona una categoría");
      return;
    }
    if (!selectedMedio) {
      setFMsg("Selecciona un medio (Box)");
      return;
    }

    setFMsg("");

    const nuevoMov: Movimiento = {
      id: Math.random().toString(36).substring(7),
      tipo: tipoSel,
      monto: montoNum,
      cajita: selectedCat,
      medio: selectedMedio,
      fecha,
      nota,
    };

    setMovimientos([nuevoMov, ...movimientos]);

    setMonto("");
    setNota("");
    setSelectedCat(null);
  }

  function handleDelete(id: string) {
    setMovimientos(movimientos.filter((m) => m.id !== id));
  }

  return {
    mediosDisponibles,
    categoriasDisponibles,
    movimientos,
    tipoSel,
    setTipoSel,
    monto,
    setMonto,
    selectedCat,
    setSelectedCat,
    selectedMedio,
    setSelectedMedio,
    fecha,
    setFecha,
    nota,
    setNota,
    fMsg,
    filtroCategoria,
    setFiltroCategoria,
    categoriasFiltradas,
    handleSubmit,
    handleDelete,
  };
}
