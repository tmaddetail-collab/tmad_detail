import { ServiceOrder } from '../types'

export function printOrder(order: ServiceOrder): void {
  const win = window.open('', '_blank')
  if (!win) return

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const allPrices: number[] = []
  const vehiclesHtml = order.vehicles
    .map((v, i) => {
      const vehicleServices = order.services.filter(
        (s) => !s.orderVehicleId || s.orderVehicleId === v.id
      )
      const subTotal = vehicleServices.reduce((acc, s) => acc + s.price, 0)
      allPrices.push(subTotal)

      const srvRows = vehicleServices
        .map(
          (s) => `
    <tr>
      <td class="td">${s.service?.name || 'Serviço'}</td>
      <td class="td center">1</td>
      <td class="td right">${fmt(s.price)}</td>
    </tr>`
        )
        .join('')

      return `
    <div class="vehicle-block${i < order.vehicles.length - 1 ? ' with-divider' : ''}">
      <div class="vehicle-header">
        <div class="vehicle-title">Veículo ${i + 1}</div>
        <div class="vehicle-subtitle">${v.vehicle ? `${v.vehicle.brand} ${v.vehicle.model} - ${v.vehicle.plate || 'sem placa'}` : '—'}</div>
      </div>
      ${order.appointmentScheduledAt ? `<div class="vehicle-date"><span class="label">Execução:</span> ${new Date(order.appointmentScheduledAt).toLocaleDateString('pt-BR')}</div>` : ''}
      ${v.notes ? `<div class="obs">${v.notes}</div>` : ''}
      <table class="srv-table">
        <thead>
          <tr>
            <th class="th left">Serviço</th>
            <th class="th center" style="width:60px;">Qtd</th>
            <th class="th right" style="width:120px;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${srvRows}
          <tr class="subtotal-row">
            <td colspan="2" class="td right bold">Subtotal</td>
            <td class="td right bold price">${fmt(subTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>`
    })
    .join('')

  const grandTotal = allPrices.reduce((a, b) => a + b, 0)

  win.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordem de Serviço #${order.orderNumber}</title>
  <style>
    @page { margin: 15mm 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 30px 25px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 3px solid #E11D48;
      margin-bottom: 28px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      height: 55px;
      width: auto;
      display: block;
    }
    .company-info h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0F0F0F;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .company-info p {
      font-size: 11px;
      color: #888;
      letter-spacing: 0.3px;
    }
    .order-badge {
      background: #E11D48;
      color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      text-align: center;
    }
    .order-badge strong {
      display: block;
      font-size: 20px;
      letter-spacing: 0.5px;
    }
    .order-badge span {
      font-size: 10px;
      opacity: 0.85;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 600;
      color: #E11D48;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 6px;
      margin-bottom: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .info-grid-2 {
      grid-template-columns: 1fr 1fr;
    }
    .info-item {}
    .info-label {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 14px;
      color: #1a1a1a;
      font-weight: 500;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-open { background: #fef3c7; color: #92400e; }
    .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-finished { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .vehicle-block {
      margin-bottom: 20px;
    }
    .vehicle-block.with-divider {
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    .vehicle-header {
      margin-bottom: 8px;
    }
    .vehicle-title {
      font-size: 13px;
      font-weight: 600;
      color: #E11D48;
    }
    .vehicle-subtitle {
      font-size: 12px;
      color: #666;
    }
    .vehicle-date {
      font-size: 12px;
      color: #555;
      margin-bottom: 8px;
    }
    .vehicle-date .label {
      color: #999;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.3px;
    }
    .obs {
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      color: #555;
      margin-bottom: 10px;
    }
    .srv-table {
      width: 100%;
      border-collapse: collapse;
    }
    .th {
      padding: 8px 10px;
      background: #f7f7f7;
      font-size: 10px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #ddd;
    }
    .th.left { text-align: left; }
    .th.center { text-align: center; }
    .th.right { text-align: right; }
    .td {
      padding: 8px 10px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .td.center { text-align: center; }
    .td.right { text-align: right; }
    .td.bold { font-weight: 600; }
    .subtotal-row .td {
      border-top: 1px solid #ddd;
      border-bottom: none;
      padding-top: 10px;
    }
    .price { color: #E11D48; }
    .grand-total {
      margin-top: 4px;
      padding-top: 14px;
      border-top: 2px solid #E11D48;
      text-align: right;
    }
    .grand-total-label {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      margin-right: 16px;
    }
    .grand-total-value {
      font-size: 24px;
      font-weight: 800;
      color: #E11D48;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      gap: 40px;
    }
    .signature-box {
      flex: 1;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 8px;
      margin-top: 56px;
      font-size: 11px;
      color: #888;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 10px;
      color: #bbb;
      letter-spacing: 0.3px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <img src="${window.location.origin}/logo_tmad_detail.png" alt="tmad detail" class="logo" onerror="this.style.display='none'">
        <div class="company-info">
          <h1>tmad detail</h1>
          <p>Estética Automotiva</p>
        </div>
      </div>
      <div class="order-badge">
        <strong>${order.orderNumber}</strong>
        <span>Ordem de Serviço</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Informações da Ordem</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value"><span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span></div>
        </div>
        <div class="info-item">
          <div class="info-label">Data de Criação</div>
          <div class="info-value">${formatDateBR(order.createdAt)}</div>
        </div>
        ${order.appointmentScheduledAt ? `
        <div class="info-item">
          <div class="info-label">Data de Execução</div>
          <div class="info-value">${formatDateBR(order.appointmentScheduledAt)}</div>
        </div>` : '<div></div>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Cliente</div>
      <div class="info-grid info-grid-2">
        <div class="info-item">
          <div class="info-label">Nome</div>
          <div class="info-value">${order.client?.name || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${order.client?.email || '—'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Veículos e Serviços</div>
      ${vehiclesHtml}
      <div class="grand-total">
        <span class="grand-total-label">VALOR TOTAL</span>
        <span class="grand-total-value">${fmt(grandTotal)}</span>
      </div>
    </div>

    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line">Assinatura do Responsável</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Assinatura do Cliente</div>
      </div>
    </div>

    <div class="footer">
      tmad detail — Estética Automotiva Profissional &bull; Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
</body>
</html>`)

  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: 'Aberta',
    in_progress: 'Em Andamento',
    finished: 'Finalizada',
    cancelled: 'Cancelada',
  }
  return labels[status] || status
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}