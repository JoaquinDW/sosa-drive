PRD - Módulo de Operaciones
Proyecto: Sosa Drive ERP
Versión 1.0
Objetivo

Construir el núcleo operativo de la concesionaria.

Este módulo será el encargado de administrar todas las operaciones internas relacionadas con inventario, compras, créditos, taller, gastos y control financiero.

El sistema debe reemplazar el uso de Excel como fuente principal de información.

Toda la operación debe quedar registrada y ser completamente trazable.

Objetivos del negocio

Resolver los principales dolores actuales:

No conocer el stock real.
Diferencias entre el stock físico y el registrado.
No conocer la rentabilidad.
Falta de seguimiento de créditos.
No controlar correctamente el taller.
No tener trazabilidad sobre las motos.
Centralizar toda la operación en un único sistema.
Arquitectura

El módulo estará compuesto por los siguientes dominios:

Operaciones

├── Inventario
├── Compras
├── Stock
├── Taller
├── Créditos
├── Gastos
├── Caja
├── Clientes
├── Proveedores
├── Dashboard
└── Auditoría

1. Inventario
   Objetivo

Conocer exactamente dónde se encuentra cada moto y cuál es su estado actual.

Cada unidad debe ser única.

Nunca debe existir una moto "duplicada".

Entidad Moto

Campos

ID interno
Marca
Modelo
Año
Color
Cilindrada
Número de motor
Número de cuadro (VIN)
Patente (si aplica)
Estado
Ubicación
Fecha de ingreso
Fecha de venta
Precio de compra
Precio de venta
Observaciones
Estados posibles
Disponible

Reservada

Vendida

En Taller

En Reparación

En Tránsito

En Garantía

Baja
Ubicaciones
Salón

Depósito

Taller

Sucursal

Proveedor

Cliente
Reglas

Una moto solamente puede estar en una ubicación.

Toda modificación genera un movimiento de inventario.

Nunca se elimina una moto.

2. Movimientos de Stock

Toda modificación del inventario debe generar un movimiento.

Ejemplo

Compra

Ingreso

Transferencia

Venta

Reserva

Ingreso desde taller

Salida a taller

Permuta

Baja

Corrección manual

Cada movimiento registra

fecha
usuario
motivo
origen
destino
observaciones

El historial nunca puede modificarse.

Debe funcionar como un Kardex.

3. Compras

Registrar todas las compras realizadas.

Campos

Proveedor

Factura

Fecha

Costo

Forma de pago

Observaciones

Cada compra puede contener varias motos.

Al confirmar una compra:

se crean automáticamente las unidades
ingresan al inventario
se registra el movimiento
aumenta el stock 4. Permutas

Permitir ingresar motos provenientes de clientes.

Cada permuta genera automáticamente:

nueva unidad
ingreso al stock
valuación
historial

Debe quedar vinculada a la venta correspondiente.

5. Taller

Cada ingreso al taller genera una Orden de Trabajo.

Campos

Número

Cliente

Moto

Motivo

Mecánico

Prioridad

Estado

Fecha ingreso

Fecha estimada

Fecha entrega

Observaciones

Estados

Pendiente

En reparación

Esperando repuestos

Finalizado

Entregado

Cancelado

Gastos asociados

Cada orden puede tener

Repuestos

Insumos

Horas

Servicios externos

Fotos

Comprobantes

Cada gasto afecta automáticamente la rentabilidad del taller.

6. Inventario de Repuestos

Entidad

Repuesto

Campos

Código

Nombre

Categoría

Marca

Proveedor

Costo

Precio

Cantidad

Stock mínimo

Ubicación

Movimientos

Compra

Consumo

Venta

Ajuste

Transferencia

Alerta automática

Cuando el stock sea inferior al mínimo.

7. Gastos

Registrar cualquier gasto de la empresa.

Categorías

Sueldos

Combustible

Servicios

Alquiler

Impuestos

Taller

Repuestos

Marketing

Otros

Campos

Fecha

Importe

Descripción

Método de pago

Responsable

Adjunto

Foto del ticket

Proveedor

Cada gasto impacta automáticamente en el Dashboard Financiero.

8. Caja

Registrar todos los movimientos financieros.

Ingresos

Ventas

Cobros

Servicios

Otros

Egresos

Compras

Gastos

Sueldos

Proveedores

Otros

Debe permitir conocer

Saldo actual

Caja diaria

Caja mensual

9. Créditos

Uno de los módulos más importantes.

La concesionaria vende mediante:

contado
crédito propio
crédito bancario
Crédito propio

Debe permitir

Crear plan

Cantidad de cuotas

Monto

Interés

Interés diario

Fecha de vencimiento

Estado

Cuotas

Cada cuota tiene

Número

Vencimiento

Monto

Estado

Interés

Fecha de pago

Estados

Pendiente

Pagada

Vencida

Refinanciada

Cancelada

Refinanciación

Permitir

Cerrar crédito anterior.

Crear nuevo plan.

Mantener historial.

10. Deudores

Vista exclusiva para administración.

Listado de clientes con deuda.

Filtros

Días vencidos

Monto

Cantidad de cuotas

Estado

Acciones

Enviar WhatsApp.

Registrar pago.

Refinanciar.

Agregar nota.

Llamar.

Alertas

Cuotas próximas.

Cuotas vencidas.

Morosos críticos.

11. Clientes

Ficha única.

Información

Datos personales.

Motos compradas.

Créditos.

Pagos.

Servicios.

Historial.

Observaciones.

12. Dashboard Financiero

Widgets

Stock total

Valor del inventario

Ventas del mes

Compras del mes

Ganancia bruta

Ganancia neta

Gastos

Clientes deudores

Monto financiado

Cobrado

Pendiente

Gráficos

Ventas

Flujo de caja

Compras

Stock por marca

Ganancias

13. Auditoría

Todo queda registrado.

Ejemplo

Usuario

Acción

Fecha

IP

Entidad

Valor anterior

Valor nuevo

Nunca puede eliminarse.

Roles
Super Admin

Acceso total.

Gerente

Toda la operación.

No puede modificar auditoría.

Administración

Caja

Compras

Créditos

Gastos

Taller

Órdenes.

Repuestos.

Servicios.

Vendedor

Solo clientes.

Ventas.

Stock disponible.

Reglas de negocio
Nunca eliminar registros críticos (soft delete o estados).
Cada movimiento de stock debe generar una entrada de auditoría.
Una moto solo puede tener una ubicación y un estado a la vez.
Toda venta debe descontar automáticamente el stock.
Toda compra debe incrementar automáticamente el stock.
Los créditos generan automáticamente el calendario de cuotas.
Los pagos actualizan el estado de las cuotas y recalculan saldos pendientes.
El dashboard debe actualizarse en tiempo real a partir de los movimientos registrados.
Consideraciones técnicas para Claude Code
Arquitectura modular (DDD-lite): cada dominio (inventory, workshop, finance, credits, etc.) con sus propias entidades, servicios y repositorios.
Base de datos relacional (PostgreSQL) con auditoría y trazabilidad como prioridad.
Todas las operaciones críticas deben ejecutarse dentro de transacciones.
Implementar un sistema de Event Bus interno para disparar acciones automáticas (StockAdded, MotorcycleSold, CreditCreated, InstallmentPaid, etc.). Esto permitirá conectar fácilmente los módulos de CRM e IA en el futuro.
Diseñar el sistema para soportar múltiples sucursales desde el inicio, aunque inicialmente solo se utilice una.
Nota de diseño importante

No modelar el sistema alrededor de "motos", sino alrededor de "activos".

Hoy el activo principal es una moto, pero mañana podría ser:

Accesorios.
Repuestos.
Cuatriciclos.
UTV.
Autos.

Si la entidad Asset es la base y Motorcycle es una especialización con atributos propios (motor, cuadro, cilindrada, etc.), el sistema será mucho más flexible y reutilizable para futuras concesionarias sin reescribir el núcleo del ERP. Ese pequeño cambio arquitectónico desde el inicio puede ahorrarte muchísimo trabajo cuando quieras convertir este desarrollo en un producto comercial.
