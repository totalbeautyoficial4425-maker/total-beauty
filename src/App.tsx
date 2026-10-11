import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { NavigationPage, Appointment, Client, Service, Attendance, Expense } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgendaPage } from './pages/AgendaPage';
import { ClientesPage } from './pages/ClientesPage';
import { ServicosPage } from './pages/ServicosPage';
import { AtendimentosPage } from './pages/AtendimentosPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { MinhaProducaoPage } from './pages/MinhaProducaoPage';
import { ProfissionaisPage } from './pages/ProfissionaisPage';

// Modals
import { AppointmentModal } from './components/modals/AppointmentModal';
import { ClientModal } from './components/modals/ClientModal';
import { ClientDetailModal } from './components/modals/ClientDetailModal';
import { ServiceModal } from './components/modals/ServiceModal';
import { AttendanceFinishModal } from './components/modals/AttendanceFinishModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { WhatsAppModal } from './components/common/WhatsAppModal';
import { ChangePasswordModal } from './components/common/ChangePasswordModal';

export const AppContent: React.FC = () => {
  const { isAuthenticated, requiresPasswordChange, currentUser } = useAuth();

  // Navigation
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Role protection guard: prevent professionals from opening administrative routes
  useEffect(() => {
    if (currentUser?.role === 'profissional') {
      const allowedPages: NavigationPage[] = ['dashboard', 'agenda', 'minha-producao'];
      if (!allowedPages.includes(currentPage)) {
        setCurrentPage('dashboard');
      }
    }
  }, [currentUser, currentPage]);

  // Modal States
  // 1. Appointment Modal
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [appointmentInitialDate, setAppointmentInitialDate] = useState<string | undefined>();
  const [appointmentInitialTime, setAppointmentInitialTime] = useState<string | undefined>();
  const [appointmentInitialClientId, setAppointmentInitialClientId] = useState<string | undefined>();

  // 2. Client Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // 3. Client Detail Modal
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);

  // 4. Service Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  // 5. Attendance Finish Modal
  const [isFinishAttendanceOpen, setIsFinishAttendanceOpen] = useState(false);
  const [attendanceToFinish, setAttendanceToFinish] = useState<Attendance | null>(null);

  // 6. Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // 7. WhatsApp Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppClientName, setWhatsAppClientName] = useState('');
  const [whatsAppClientPhone, setWhatsAppClientPhone] = useState('');
  const [whatsAppData, setWhatsAppData] = useState<any>(null);

  // 8. Voluntary Change Password Modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Handlers for Opening Modals
  const handleOpenNewAppointment = (initialDate?: string, initialTime?: string, initialClientId?: string) => {
    setAppointmentToEdit(null);
    setAppointmentInitialDate(initialDate);
    setAppointmentInitialTime(initialTime);
    setAppointmentInitialClientId(initialClientId);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setAppointmentToEdit(apt);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenNewClient = () => {
    setClientToEdit(null);
    setIsClientModalOpen(true);
  };

  const handleEditClient = (cli: Client) => {
    setClientToEdit(cli);
    setIsClientModalOpen(true);
  };

  const handleViewClientDetails = (cli: Client) => {
    setSelectedClientForDetail(cli);
    setIsClientDetailOpen(true);
  };

  const handleOpenNewService = () => {
    setServiceToEdit(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (srv: Service) => {
    setServiceToEdit(srv);
    setIsServiceModalOpen(true);
  };

  const handleOpenFinishAttendance = (atd: Attendance) => {
    setAttendanceToFinish(atd);
    setIsFinishAttendanceOpen(true);
  };

  const handleOpenNewExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (exp: Expense) => {
    setExpenseToEdit(exp);
    setIsExpenseModalOpen(true);
  };

  const handleOpenWhatsApp = (name: string, phone: string, extraData?: any) => {
    setWhatsAppClientName(name);
    setWhatsAppClientPhone(phone);
    setWhatsAppData(extraData);
    setIsWhatsAppModalOpen(true);
  };

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-tb-ivory text-tb-brown-dark flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={setCurrentPage}
          onOpenNewAppointment={() => handleOpenNewAppointment()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentPage}
              onOpenNewAppointment={() => handleOpenNewAppointment()}
              onOpenWhatsApp={handleOpenWhatsApp}
              onOpenAppointmentDetails={handleEditAppointment}
            />
          )}

          {currentPage === 'agenda' && (
            <AgendaPage
              onOpenNewAppointment={handleOpenNewAppointment}
              onEditAppointment={handleEditAppointment}
              onOpenWhatsApp={handleOpenWhatsApp}
            />
          )}

          {currentPage === 'clientes' && (
            <ClientesPage
              onOpenNewClient={handleOpenNewClient}
              onEditClient={handleEditClient}
              onViewClientDetails={handleViewClientDetails}
              onOpenWhatsApp={handleOpenWhatsApp}
              onNewAppointmentForClient={(clientId) => handleOpenNewAppointment(undefined, undefined, clientId)}
            />
          )}

          {currentPage === 'servicos' && (
            <ServicosPage
              onOpenNewService={handleOpenNewService}
              onEditService={handleEditService}
            />
          )}

          {currentPage === 'profissionais' && (
            <ProfissionaisPage />
          )}

          {currentPage === 'atendimentos' && (
            <AtendimentosPage
              onOpenFinishAttendance={handleOpenFinishAttendance}
              onOpenNewAppointment={() => handleOpenNewAppointment()}
            />
          )}

          {currentPage === 'financeiro' && (
            <FinanceiroPage
              onOpenNewExpense={handleOpenNewExpense}
              onEditExpense={handleEditExpense}
            />
          )}

          {currentPage === 'relatorios' && (
            <RelatoriosPage />
          )}

          {currentPage === 'configuracoes' && (
            <ConfiguracoesPage
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
          )}

          {currentPage === 'minha-producao' && (
            <MinhaProducaoPage />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Forced Password Change on First Login */}
      {requiresPasswordChange && (
        <ChangePasswordModal
          isOpen={true}
          isForcedFirstLogin={true}
        />
      )}

      {/* 2. Voluntary Password Change */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          isForcedFirstLogin={false}
        />
      )}

      {/* 3. Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        appointmentToEdit={appointmentToEdit}
        initialDate={appointmentInitialDate}
        initialTime={appointmentInitialTime}
        initialClientId={appointmentInitialClientId}
      />

      {/* 4. Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clientToEdit={clientToEdit}
      />

      {/* 5. Client Detail Dossier */}
      <ClientDetailModal
        isOpen={isClientDetailOpen}
        onClose={() => setIsClientDetailOpen(false)}
        client={selectedClientForDetail}
        onEditClient={handleEditClient}
        onOpenWhatsApp={handleOpenWhatsApp}
        onNewAppointmentForClient={(clientId) => handleOpenNewAppointment(undefined, undefined, clientId)}
      />

      {/* 6. Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        serviceToEdit={serviceToEdit}
      />

      {/* 7. Attendance Finish Modal */}
      <AttendanceFinishModal
        isOpen={isFinishAttendanceOpen}
        onClose={() => setIsFinishAttendanceOpen(false)}
        attendance={attendanceToFinish}
      />

      {/* 8. Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenseToEdit={expenseToEdit}
      />

      {/* 9. WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        clientName={whatsAppClientName}
        clientPhone={whatsAppClientPhone}
        appointmentData={whatsAppData}
      />
    </div>
  );
};
