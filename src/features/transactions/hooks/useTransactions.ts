import { useState, useEffect } from "react";
import { transactionsService } from "../services/transactions.service";

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
  const [mediosData, setMediosData] = useState<{ id: string; nombre: string }[]>([]);
  const [categoriasData, setCategoriasData] = useState<
    { id: string; nombre: string; tipo: "gasto" | "ingreso" }[]
  >([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [tipoSel, setTipoSel] = useState<"gasto" | "ingreso">("gasto");
  const [monto, setMonto] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedMedio, setSelectedMedio] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0] as string);
  const [nota, setNota] = useState("");
  const [fMsg, setFMsg] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  // Carga inicial: movimientos + catálogos de medios y categorías reales
  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true);
      const [movsData, mediosRes, categoriasRes] = await Promise.all([
        transactionsService.obtenerMovimientos(),
        transactionsService.obtenerMedios(),
        transactionsService.obtenerCategorias(),
      ]);
      setMovimientos(movsData);
      setMediosData(mediosRes);
      setCategoriasData(categoriasRes);
      setIsLoading(false);
    }
    cargarDatos();
  }, []);

  const mediosDisponibles = mediosData.map((m) => m.nombre);
  const categoriasDisponibles: CategoriaBase[] = categoriasData.map((c) => ({
    name: c.nombre,
    tipo: c.tipo,
  }));

  const categoriasFiltradas = categoriasDisponibles.filter((c) => c.tipo === tipoSel);

  async function handleSubmit(e: React.FormEvent) {
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

    const categoriaObj = categoriasData.find((c) => c.nombre === selectedCat);
    const medioObj = mediosData.find((m) => m.nombre === selectedMedio);

    if (!categoriaObj || !medioObj) {
      setFMsg("Categoría o medio inválido");
      return;
    }

    setFMsg("");

    const resultado = await transactionsService.crearMovimiento({
      tipo: tipoSel,
      monto: montoNum,
      medioId: medioObj.id,
      categoriaId: categoriaObj.id,
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

  async function handleDelete(id: string) {
    const exito = await transactionsService.eliminarMovimiento(id);
    if (exito) {
      setMovimientos(movimientos.filter((m) => m.id !== id));
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
    categoriasFiltradas,
    handleSubmit,
    handleDelete,
  };
}
