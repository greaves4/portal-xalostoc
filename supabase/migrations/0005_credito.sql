-- credito_usado lo calcula un trigger (suma de pedidos comprometidos), asi que un
-- ajuste manual se perdia en el siguiente movimiento del cliente. Se separa lo que
-- el sistema calcula de lo que decide un humano: los pagos van aparte.

begin;

alter table clients add column credito_liquidado numeric(12,2) not null default 0;

comment on column clients.credito_usado is 'Calculado por trigger: suma de pedidos aprobados/sincronizados/sync_error. No editar a mano.';
comment on column clients.credito_liquidado is 'Lo registra el admin cuando el cliente paga. Disponible = limite - (usado - liquidado).';

commit;
