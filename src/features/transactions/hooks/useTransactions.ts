import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transactions.service";
import {
  categoriasQuery,
  mediosQuery,
  movimientoCreado,
  movimientoEliminado,
  movimientosQuery,
} from "@/lib/queries";

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

const SIN_MOVIMIENTOS: Movimiento[] = [];

export function useTransactions() {
  const queryClient = useQueryClient();
  const movimientosQ = useQuery(movimientosQuery);
  const mediosQ = useQuery(mediosQuery);
  const categoriasQ = useQuery(categoriasQuery);

  const movimientos = movimientosQ.data ?? SIN_MOVIMIENTOS;
  const isLoading = movimientosQ.isPending || mediosQ.isPending || categoriasQ.isPending;

  // Los selectores se muestran ordenados por nombre
  const mediosData = useMemo(
    () => [...(mediosQ.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [mediosQ.data],
  );
  const categoriasData = useMemo(
    () => [...(categoriasQ.data ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categoriasQ.data],
  );

  const [tipoSel, setTipoSel] = useState<"gasto" | "ingreso">("gasto");
  const [monto, setMonto] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedMedio, setSelectedMedio] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0] as string);
  const [nota, setNota] = useState("");
  const [fMsg, setFMsg] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActual);

  const mediosDisponibles = mediosData.map((m) => m.nombre);
  const categoriasDisponibles: CategoriaBase[] = categoriasData.map((c) => ({
    name: c.nombre,
    tipo: c.tipo,
  }));

  const categoriasFiltradas = categoriasDisponibles.filter((c) => c.tipo === tipoSel);

  // Meses disponibles para filtrar la tabla: los que tengan movimientos + el mes actual siempre presente
  const monthOptions = useMemo(() => {
    const meses = new Set<string>(movimientos.map((m) => m.fecha.substring(0, 7)));
    meses.add(mesActual);

    return Array.from(meses)
      .sort((a, b) => b.localeCompare(a)) // más reciente primero
      .map((m) => {
        const [year = 0, month = 1] = m.split("-").map(Number);
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [movimientos, mesActual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = parseFloat(monto);

    if (!montoNum || montoNum <= 0) {
      setFMsg("Ingresa un monto válido mayor a 0");
      return;
    }
    if (!selectedMedio) {
      setFMsg("Selecciona un medio (Box)");
      return;
    }

    // La categoría es opcional: sin ella, el movimiento no se contabiliza
    // en los totales del dashboard (sirve para traspasos entre medios).
    const categoriaObj = selectedCat
      ? categoriasData.find((c) => c.nombre === selectedCat)
      : undefined;
    const medioObj = mediosData.find((m) => m.nombre === selectedMedio);

    if (!medioObj) {
      setFMsg("Medio inválido");
      return;
    }

    setFMsg("");

    const resultado = await transactionsService.crearMovimiento({
      tipo: tipoSel,
      monto: montoNum,
      medioId: medioObj.id,
      categoriaId: categoriaObj?.id ?? null,
      fecha,
      nota,
    });

    if (!resultado) {
      setFMsg("No se pudo guardar el movimiento");
      return;
    }

    const nuevoMov: Movimiento = {
      id: resultado.id,
      tipo: tipoSel,
      monto: montoNum,
      cajita: selectedCat ?? "",
      medio: selectedMedio,
      fecha,
      nota,
    };

    await movimientoCreado(queryClient, nuevoMov);

    setMonto("");
    setNota("");
    setSelectedCat(null);
  }

  async function handleDelete(id: string) {
    const exito = await transactionsService.eliminarMovimiento(id);
    if (exito) {
      await movimientoEliminado(queryClient, id);
    }
  }

  return {
    mediosDisponibles,
    categoriasDisponibles,
    movimientos,
    isLoading,
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
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    categoriasFiltradas,
    handleSubmit,
    handleDelete,
  };
}
