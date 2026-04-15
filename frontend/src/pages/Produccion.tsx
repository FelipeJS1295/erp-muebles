import React, { useState, useEffect } from 'react';

// Estilos locales siguiendo tu línea de diseño
const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '0.5px solid var(--border)' },
  content: { padding: '24px', display: 'flex', gap: '24px' },
  card: { background: 'var(--bg-2)', borderRadius: '10px', border: '0.5px solid var(--border)', padding: '20px', flex: 1 },
  sideCard: { background: 'var(--bg-2)', borderRadius: '10px', border: '0.5px solid var(--border)', padding: '20px', width: '320px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { textAlign: 'left' as const, color: 'var(--text-3)', fontWeight: 500, padding: '12px 8px', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase' as const, fontSize: '10px', letterSpacing: '0.05em' },
  td: { padding: '12px 8px', borderBottom: '0.5px solid var(--border)', color: 'var(--text-1)' },
  input: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', marginBottom: '12px', fontSize: '13px' },
  label: { fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px', display: 'block' },
  btn: { width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 500, cursor: 'pointer' }
};

export default function Produccion() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', rut: '', correo: '', password: '', rol: 'Tapicería' });

  // Aquí conectarías con tu API real después
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nuevo operario:", form);
    // produccionApi.crearUsuario(form)...
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <header style={s.header}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Gestión de Operarios</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Personal de taller y asignación de roles</p>
        </div>
      </header>

      <div style={s.content}>
        {/* Tabla de Usuarios */}
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>RUT</th>
                <th style={s.th}>Especialidad (Rol)</th>
                <th style={s.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {/* Ejemplo estático para visualizar */}
              <tr>
                <td style={s.td}>Juan Pérez</td>
                <td style={s.td}>12.345.678-9</td>
                <td style={s.td}>
                   <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--info-bg)', color: 'var(--info)', fontSize: '11px', fontWeight: 600 }}>Tapicería</span>
                </td>
                <td style={s.td}><span style={{color: 'var(--success)'}}>● Activo</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Formulario de Alta */}
        <div style={s.sideCard}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: 600 }}>Registrar Nuevo</h3>
          <form onSubmit={handleSubmit}>
            <label style={s.label}>Nombre Completo</label>
            <input style={s.input} placeholder="Ej: Pedro Soto" onChange={e => setForm({...form, nombre: e.target.value})} />
            
            <label style={s.label}>RUT</label>
            <input style={s.input} placeholder="12.345.678-k" onChange={e => setForm({...form, rut: e.target.value})} />
            
            <label style={s.label}>Especialidad</label>
            <select style={{...s.input, appearance: 'none'}} onChange={e => setForm({...form, rol: e.target.value})}>
              <option value="Tapicería">Tapicería</option>
              <option value="Costura">Costura</option>
              <option value="Esqueleteria">Esqueletería</option>
            </select>

            <label style={s.label}>Contraseña Acceso</label>
            <input type="password" style={s.input} placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} />
            
            <button type="submit" style={s.btn}>Guardar Operario</button>
          </form>
        </div>
      </div>
    </div>
  );
}