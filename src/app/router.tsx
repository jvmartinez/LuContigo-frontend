import type { QueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { redirigirAInicio, requiereSesion, soloInvitados } from '@/auth/guardas';
import { ROLES_POR_SECCION } from '@/auth/rutas';
import { ErrorRuta, NoEncontrada } from './ErrorRuta';
import { LayoutApp } from './layout/LayoutApp';
import { RaizApp } from './RaizApp';

/** Cada pantalla se descarga al abrirla: la agenda no carga el código del panel ni del portal. */
const pagina = (cargar: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await cargar()).default,
});

/** Rutas y guardas por rol (FRONTEND.md §5). Se exportan para montarlas en las pruebas. */
export function crearRutas(qc: QueryClient): RouteObject[] {
  const conRol = (
    roles: (typeof ROLES_POR_SECCION)[keyof typeof ROLES_POR_SECCION],
    children: RouteObject[],
  ) => ({
    loader: requiereSesion(qc, roles),
    children,
  });

  return [
    {
      element: <RaizApp />,
      errorElement: <ErrorRuta />,
      children: [
        // ─── Públicas ────────────────────────────────────────────────────────
        {
          path: '/login',
          loader: soloInvitados(qc),
          lazy: pagina(() => import('@/features/acceso/LoginPage')),
        },
        {
          path: '/olvide-contrasena',
          lazy: pagina(() => import('@/features/acceso/OlvideContrasenaPage')),
        },
        {
          path: '/restablecer/:token',
          lazy: pagina(() => import('@/features/acceso/RestablecerPage')),
        },
        {
          path: '/c/:token',
          lazy: pagina(() => import('@/features/confirmacion/ConfirmacionPage')),
        },

        // ─── Con sesión ──────────────────────────────────────────────────────
        {
          path: '/',
          loader: requiereSesion(qc),
          element: <LayoutApp />,
          children: [
            {
              errorElement: <ErrorRuta />,
              children: [
                { index: true, loader: redirigirAInicio(qc) },

                conRol(ROLES_POR_SECCION.agenda, [
                  {
                    path: 'agenda',
                    lazy: pagina(() => import('@/features/agenda/AgendaPage')),
                    children: [
                      {
                        path: 'nueva',
                        lazy: pagina(() => import('@/features/agenda/NuevaCitaPanel')),
                      },
                    ],
                  },
                ]),
                conRol(ROLES_POR_SECCION.pacientes, [
                  {
                    path: 'pacientes',
                    lazy: pagina(() => import('@/features/pacientes/PacientesPage')),
                  },
                  {
                    path: 'pacientes/nuevo',
                    lazy: pagina(() => import('@/features/pacientes/PacienteNuevoPage')),
                  },
                  {
                    path: 'pacientes/:id',
                    lazy: pagina(() => import('@/features/pacientes/PacienteDetallePage')),
                  },
                ]),
                conRol(ROLES_POR_SECCION.enfermeria, [
                  {
                    path: 'enfermeria',
                    lazy: pagina(() => import('@/features/enfermeria/EnfermeriaPage')),
                  },
                  {
                    path: 'enfermeria/triaje/:citaId',
                    lazy: pagina(() => import('@/features/enfermeria/TriajePage')),
                  },
                ]),
                conRol(ROLES_POR_SECCION.consultorio, [
                  {
                    path: 'consultorio',
                    lazy: pagina(() => import('@/features/consulta/ConsultorioPage')),
                  },
                  {
                    path: 'consultorio/:citaId',
                    lazy: pagina(() => import('@/features/consulta/ConsultorioPage')),
                  },
                ]),
                conRol(ROLES_POR_SECCION.portal, [
                  {
                    path: 'mis-citas',
                    lazy: pagina(() => import('@/features/portal/MisCitasPage')),
                  },
                  {
                    path: 'mis-citas/nueva',
                    lazy: pagina(() => import('@/features/portal/SolicitarCitaPage')),
                  },
                  {
                    path: 'mis-indicaciones',
                    lazy: pagina(() => import('@/features/portal/IndicacionesPage')),
                  },
                ]),
                conRol(ROLES_POR_SECCION.admin, [
                  { path: 'admin', loader: redirigirAInicio(qc) },
                  {
                    path: 'admin/panel',
                    lazy: pagina(() => import('@/features/indicadores/PanelPage')),
                  },
                  {
                    path: 'admin/personal',
                    lazy: pagina(() => import('@/features/personal/PersonalPage')),
                  },
                  {
                    path: 'admin/personal/:id',
                    lazy: pagina(() => import('@/features/personal/PersonalDetallePage')),
                  },
                  {
                    path: 'admin/asignaciones',
                    lazy: pagina(() => import('@/features/asignaciones/AsignacionesPage')),
                  },
                  {
                    path: 'admin/consultorios',
                    lazy: pagina(() => import('@/features/consultorios/ConsultoriosPage')),
                  },
                  {
                    path: 'admin/bitacora',
                    lazy: pagina(() => import('@/features/auditoria/BitacoraPage')),
                  },
                ]),

                { path: '*', element: <NoEncontrada /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}

export function crearRouter(qc: QueryClient) {
  return createBrowserRouter(crearRutas(qc));
}
