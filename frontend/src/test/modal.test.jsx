import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { Confirmar, Modal } from '../components/ui.jsx'

function ModalesAnidados() {
  const [detalle, setDetalle] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  return (
    <>
      <button onClick={() => setDetalle(true)}>Abrir detalle</button>
      <Modal abierto={detalle} titulo="Detalle" onCerrar={() => setDetalle(false)}>
        <button onClick={() => setConfirmar(true)}>Cancelar pedido</button>
      </Modal>
      <Confirmar abierto={confirmar} titulo="¿Seguro?" mensaje="No se puede deshacer" onCerrar={() => setConfirmar(false)} onConfirmar={() => {}} />
    </>
  )
}

describe('Modal', () => {
  test('al abrir, el foco entra al diálogo y al cerrar vuelve al botón', async () => {
    const user = userEvent.setup()
    render(<ModalesAnidados />)
    const abrir = screen.getByRole('button', { name: 'Abrir detalle' })
    await user.click(abrir)
    expect(screen.getByRole('dialog', { name: 'Detalle' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  test('con dos modales abiertos, Escape cierra solo el de arriba', async () => {
    const user = userEvent.setup()
    render(<ModalesAnidados />)
    await user.click(screen.getByRole('button', { name: 'Abrir detalle' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    await user.keyboard('{Escape}')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Detalle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toHaveFocus()
  })

  test('Tab no se sale del diálogo', async () => {
    const user = userEvent.setup()
    render(<ModalesAnidados />)
    await user.click(screen.getByRole('button', { name: 'Abrir detalle' }))
    const cerrar = screen.getByRole('button', { name: 'Cerrar' })
    const interno = screen.getByRole('button', { name: 'Cancelar pedido' })
    await user.tab()
    expect(cerrar).toHaveFocus()
    await user.tab()
    expect(interno).toHaveFocus()
    await user.tab()
    expect(cerrar).toHaveFocus()
  })
})
