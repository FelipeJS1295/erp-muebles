const API_URL = "http://localhost:8000/api/v1/produccion";

export const produccionApi = {
  getUsuarios: async () => {
    const res = await fetch(`${API_URL}/usuarios`);
    return res.json();
  },
  crearUsuario: async (data: any) => {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear usuario");
    return res.json();
  }
};