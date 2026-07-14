import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { vehiclesApi } from '@/api/vehicles'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { Vehicle, VehicleForm, VehicleType, ServiceOrder } from '@/types'
import { formatDate, getVehicleTypeLabel } from '@/utils/formatters'
import { validatePlate } from '@/utils/validators'
import {
  Car,
  Plus,
  Edit3,
  Trash2,
  History,
  AlertCircle,
  RefreshCw,
  Gauge,
  Palette,
  CalendarDays,
  FileText,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const brandOptions = [
  { value: '', label: 'Selecione a marca' },
  { value: 'Fiat', label: 'Fiat' },
  { value: 'Volkswagen', label: 'Volkswagen' },
  { value: 'Chevrolet', label: 'Chevrolet' },
  { value: 'Ford', label: 'Ford' },
  { value: 'Toyota', label: 'Toyota' },
  { value: 'Honda', label: 'Honda' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Jeep', label: 'Jeep' },
  { value: 'Nissan', label: 'Nissan' },
  { value: 'Renault', label: 'Renault' },
  { value: 'Peugeot', label: 'Peugeot' },
  { value: 'Citroën', label: 'Citroën' },
  { value: 'Mitsubishi', label: 'Mitsubishi' },
  { value: 'BMW', label: 'BMW' },
  { value: 'Mercedes-Benz', label: 'Mercedes-Benz' },
  { value: 'Audi', label: 'Audi' },
  { value: 'Kia', label: 'Kia' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Land Rover', label: 'Land Rover' },
  { value: 'Chery', label: 'Chery' },
  { value: 'BYD', label: 'BYD' },
  { value: 'GWM', label: 'GWM' },
  { value: 'RAM', label: 'RAM' },
  { value: 'Subaru', label: 'Subaru' },
  { value: 'Suzuki', label: 'Suzuki' },
  { value: 'Porsche', label: 'Porsche' },
  { value: 'Jaguar', label: 'Jaguar' },
  { value: 'Lexus', label: 'Lexus' },
  { value: 'Mini', label: 'Mini' },
  { value: 'Chrysler', label: 'Chrysler' },
  { value: 'Dodge', label: 'Dodge' },
  { value: 'Alfa Romeo', label: 'Alfa Romeo' },
  { value: 'Maserati', label: 'Maserati' },
  { value: 'Ferrari', label: 'Ferrari' },
  { value: 'Lamborghini', label: 'Lamborghini' },
  { value: 'Aston Martin', label: 'Aston Martin' },
  { value: 'Bentley', label: 'Bentley' },
  { value: 'Rolls-Royce', label: 'Rolls-Royce' },
  { value: 'McLaren', label: 'McLaren' },
  { value: 'MG', label: 'MG' },
  { value: 'Changan', label: 'Changan' },
  { value: 'SsangYong', label: 'SsangYong' },
  { value: 'Daihatsu', label: 'Daihatsu' },
  { value: 'Bugatti', label: 'Bugatti' },
  { value: 'Outro', label: 'Outro' },
]

const modelsByBrand: Record<string, { value: string; label: string }[]> = {
  Fiat: [
    { value: '500', label: '500' },
    { value: '500L', label: '500L' },
    { value: '500X', label: '500X' },
    { value: '124 Spider', label: '124 Spider' },
    { value: 'Argo', label: 'Argo' },
    { value: 'Bravo', label: 'Bravo' },
    { value: 'Cronos', label: 'Cronos' },
    { value: 'Doblò', label: 'Doblò' },
    { value: 'Ducato', label: 'Ducato' },
    { value: 'Fiorino', label: 'Fiorino' },
    { value: 'Freemont', label: 'Freemont' },
    { value: 'Idea', label: 'Idea' },
    { value: 'Linea', label: 'Linea' },
    { value: 'Mobi', label: 'Mobi' },
    { value: 'Multipla', label: 'Multipla' },
    { value: 'Palio', label: 'Palio' },
    { value: 'Panda', label: 'Panda' },
    { value: 'Pulse', label: 'Pulse' },
    { value: 'Punto', label: 'Punto' },
    { value: 'Stilo', label: 'Stilo' },
    { value: 'Strada', label: 'Strada' },
    { value: 'Tempra', label: 'Tempra' },
    { value: 'Tipo', label: 'Tipo' },
    { value: 'Toro', label: 'Toro' },
    { value: 'Uno', label: 'Uno' },
  ],
  Volkswagen: [
    { value: 'Amarok', label: 'Amarok' },
    { value: 'Arteon', label: 'Arteon' },
    { value: 'Beetle', label: 'Beetle' },
    { value: 'Bora', label: 'Bora' },
    { value: 'CC', label: 'CC' },
    { value: 'Crafter', label: 'Crafter' },
    { value: 'Eos', label: 'Eos' },
    { value: 'Fox', label: 'Fox' },
    { value: 'Gol', label: 'Gol' },
    { value: 'Golf', label: 'Golf' },
    { value: 'ID.3', label: 'ID.3' },
    { value: 'ID.4', label: 'ID.4' },
    { value: 'ID.5', label: 'ID.5' },
    { value: 'ID.7', label: 'ID.7' },
    { value: 'ID.Buzz', label: 'ID.Buzz' },
    { value: 'Jetta', label: 'Jetta' },
    { value: 'Kombi', label: 'Kombi' },
    { value: 'Nivus', label: 'Nivus' },
    { value: 'Passat', label: 'Passat' },
    { value: 'Phaeton', label: 'Phaeton' },
    { value: 'Polo', label: 'Polo' },
    { value: 'Saveiro', label: 'Saveiro' },
    { value: 'Scirocco', label: 'Scirocco' },
    { value: 'Sharan', label: 'Sharan' },
    { value: 'Taos', label: 'Taos' },
    { value: 'T-Cross', label: 'T-Cross' },
    { value: 'Tiguan', label: 'Tiguan' },
    { value: 'Touareg', label: 'Touareg' },
    { value: 'Touran', label: 'Touran' },
    { value: 'Up!', label: 'Up!' },
    { value: 'Virtus', label: 'Virtus' },
    { value: 'Voyage', label: 'Voyage' },
  ],
  Chevrolet: [
    { value: 'Agile', label: 'Agile' },
    { value: 'Astra', label: 'Astra' },
    { value: 'Aveo', label: 'Aveo' },
    { value: 'Blazer', label: 'Blazer' },
    { value: 'Bolt EV', label: 'Bolt EV' },
    { value: 'Bolt EUV', label: 'Bolt EUV' },
    { value: 'Camaro', label: 'Camaro' },
    { value: 'Captiva', label: 'Captiva' },
    { value: 'Caravan', label: 'Caravan' },
    { value: 'Celta', label: 'Celta' },
    { value: 'Chevette', label: 'Chevette' },
    { value: 'Chevy 500', label: 'Chevy 500' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Cobalt', label: 'Cobalt' },
    { value: 'Colorado', label: 'Colorado' },
    { value: 'Corsa', label: 'Corsa' },
    { value: 'Corsa Classic', label: 'Corsa Classic' },
    { value: 'Corvette', label: 'Corvette' },
    { value: 'Cruze', label: 'Cruze' },
    { value: 'D20', label: 'D20' },
    { value: 'Equinox', label: 'Equinox' },
    { value: 'Impala', label: 'Impala' },
    { value: 'Ipanema', label: 'Ipanema' },
    { value: 'Joy', label: 'Joy' },
    { value: 'Kadett', label: 'Kadett' },
    { value: 'Lumina', label: 'Lumina' },
    { value: 'Malibu', label: 'Malibu' },
    { value: 'Meriva', label: 'Meriva' },
    { value: 'Montana', label: 'Montana' },
    { value: 'Monza', label: 'Monza' },
    { value: 'Omega', label: 'Omega' },
    { value: 'Onix', label: 'Onix' },
    { value: 'Onix Plus', label: 'Onix Plus' },
    { value: 'Opala', label: 'Opala' },
    { value: 'Prisma', label: 'Prisma' },
    { value: 'S10', label: 'S10' },
    { value: 'Silverado', label: 'Silverado' },
    { value: 'Sonic', label: 'Sonic' },
    { value: 'Spark', label: 'Spark' },
    { value: 'Spin', label: 'Spin' },
    { value: 'Suburban', label: 'Suburban' },
    { value: 'Tahoe', label: 'Tahoe' },
    { value: 'Tracker', label: 'Tracker' },
    { value: 'Trailblazer', label: 'Trailblazer' },
    { value: 'Vectra', label: 'Vectra' },
    { value: 'Veraneio', label: 'Veraneio' },
    { value: 'Zafira', label: 'Zafira' },
  ],
  Ford: [
    { value: 'Bronco', label: 'Bronco' },
    { value: 'Bronco Sport', label: 'Bronco Sport' },
    { value: 'Corcel', label: 'Corcel' },
    { value: 'Courier', label: 'Courier' },
    { value: 'EcoSport', label: 'EcoSport' },
    { value: 'Edge', label: 'Edge' },
    { value: 'Escort', label: 'Escort' },
    { value: 'Explorer', label: 'Explorer' },
    { value: 'F-150', label: 'F-150' },
    { value: 'Fiesta', label: 'Fiesta' },
    { value: 'Focus', label: 'Focus' },
    { value: 'Fusion', label: 'Fusion' },
    { value: 'GT', label: 'GT' },
    { value: 'Ka', label: 'Ka' },
    { value: 'Maverick', label: 'Maverick' },
    { value: 'Mondeo', label: 'Mondeo' },
    { value: 'Mustang', label: 'Mustang' },
    { value: 'Mustang Mach-E', label: 'Mustang Mach-E' },
    { value: 'Puma', label: 'Puma' },
    { value: 'Ranger', label: 'Ranger' },
    { value: 'Taurus', label: 'Taurus' },
    { value: 'Territory', label: 'Territory' },
    { value: 'Transit', label: 'Transit' },
  ],
  Toyota: [
    { value: '4Runner', label: '4Runner' },
    { value: 'Avalon', label: 'Avalon' },
    { value: 'bZ4X', label: 'bZ4X' },
    { value: 'C-HR', label: 'C-HR' },
    { value: 'Camry', label: 'Camry' },
    { value: 'Celica', label: 'Celica' },
    { value: 'Corolla', label: 'Corolla' },
    { value: 'Corolla Cross', label: 'Corolla Cross' },
    { value: 'Etios', label: 'Etios' },
    { value: 'GR Corolla', label: 'GR Corolla' },
    { value: 'GR Yaris', label: 'GR Yaris' },
    { value: 'GR86', label: 'GR86' },
    { value: 'Highlander', label: 'Highlander' },
    { value: 'Hilux', label: 'Hilux' },
    { value: 'Land Cruiser', label: 'Land Cruiser' },
    { value: 'MR2', label: 'MR2' },
    { value: 'Prado', label: 'Prado' },
    { value: 'Prius', label: 'Prius' },
    { value: 'RAV4', label: 'RAV4' },
    { value: 'Sequoia', label: 'Sequoia' },
    { value: 'Sienna', label: 'Sienna' },
    { value: 'Supra', label: 'Supra' },
    { value: 'SW4', label: 'SW4' },
    { value: 'Tacoma', label: 'Tacoma' },
    { value: 'Tundra', label: 'Tundra' },
    { value: 'Yaris', label: 'Yaris' },
  ],
  Honda: [
    { value: 'Accord', label: 'Accord' },
    { value: 'City', label: 'City' },
    { value: 'Civic', label: 'Civic' },
    { value: 'Clarity', label: 'Clarity' },
    { value: 'CR-V', label: 'CR-V' },
    { value: 'CR-Z', label: 'CR-Z' },
    { value: 'e', label: 'e' },
    { value: 'Element', label: 'Element' },
    { value: 'Fit', label: 'Fit' },
    { value: 'HR-V', label: 'HR-V' },
    { value: 'Insight', label: 'Insight' },
    { value: 'Integra', label: 'Integra' },
    { value: 'NSX', label: 'NSX' },
    { value: 'Odyssey', label: 'Odyssey' },
    { value: 'Passport', label: 'Passport' },
    { value: 'Pilot', label: 'Pilot' },
    { value: 'Prelude', label: 'Prelude' },
    { value: 'Ridgeline', label: 'Ridgeline' },
    { value: 'S2000', label: 'S2000' },
  ],
  Hyundai: [
    { value: 'Accent', label: 'Accent' },
    { value: 'Atos', label: 'Atos' },
    { value: 'Azera', label: 'Azera' },
    { value: 'Bayon', label: 'Bayon' },
    { value: 'Creta', label: 'Creta' },
    { value: 'Elantra', label: 'Elantra' },
    { value: 'Equus', label: 'Equus' },
    { value: 'HB20', label: 'HB20' },
    { value: 'i10', label: 'i10' },
    { value: 'i20', label: 'i20' },
    { value: 'i30', label: 'i30' },
    { value: 'Ioniq', label: 'Ioniq' },
    { value: 'Ioniq 5', label: 'Ioniq 5' },
    { value: 'Ioniq 6', label: 'Ioniq 6' },
    { value: 'Kona', label: 'Kona' },
    { value: 'Nexo', label: 'Nexo' },
    { value: 'Palisade', label: 'Palisade' },
    { value: 'Santa Cruz', label: 'Santa Cruz' },
    { value: 'Santa Fe', label: 'Santa Fe' },
    { value: 'Sonata', label: 'Sonata' },
    { value: 'Staria', label: 'Staria' },
    { value: 'Tucson', label: 'Tucson' },
    { value: 'Veloster', label: 'Veloster' },
    { value: 'Venue', label: 'Venue' },
  ],
  Jeep: [
    { value: 'Avenger', label: 'Avenger' },
    { value: 'Cherokee', label: 'Cherokee' },
    { value: 'Commander', label: 'Commander' },
    { value: 'Compass', label: 'Compass' },
    { value: 'Gladiator', label: 'Gladiator' },
    { value: 'Grand Cherokee', label: 'Grand Cherokee' },
    { value: 'Liberty', label: 'Liberty' },
    { value: 'Patriot', label: 'Patriot' },
    { value: 'Renegade', label: 'Renegade' },
    { value: 'Wagoneer', label: 'Wagoneer' },
    { value: 'Wrangler', label: 'Wrangler' },
  ],
  Nissan: [
    { value: 'Altima', label: 'Altima' },
    { value: 'Ariya', label: 'Ariya' },
    { value: 'Frontier', label: 'Frontier' },
    { value: 'GT-R', label: 'GT-R' },
    { value: 'Juke', label: 'Juke' },
    { value: 'Kicks', label: 'Kicks' },
    { value: 'Leaf', label: 'Leaf' },
    { value: 'March', label: 'March' },
    { value: 'Maxima', label: 'Maxima' },
    { value: 'Murano', label: 'Murano' },
    { value: 'Note', label: 'Note' },
    { value: 'Pathfinder', label: 'Pathfinder' },
    { value: 'Patrol', label: 'Patrol' },
    { value: 'Qashqai', label: 'Qashqai' },
    { value: 'Sentra', label: 'Sentra' },
    { value: 'Skyline', label: 'Skyline' },
    { value: 'Versa', label: 'Versa' },
    { value: 'X-Trail', label: 'X-Trail' },
    { value: 'Z', label: 'Z' },
  ],
  Renault: [
    { value: 'Arkana', label: 'Arkana' },
    { value: 'Austral', label: 'Austral' },
    { value: 'Captur', label: 'Captur' },
    { value: 'Clio', label: 'Clio' },
    { value: 'Duster', label: 'Duster' },
    { value: 'Espace', label: 'Espace' },
    { value: 'Fluence', label: 'Fluence' },
    { value: 'Kangoo', label: 'Kangoo' },
    { value: 'Koleos', label: 'Koleos' },
    { value: 'Kwid', label: 'Kwid' },
    { value: 'Latitude', label: 'Latitude' },
    { value: 'Logan', label: 'Logan' },
    { value: 'Master', label: 'Master' },
    { value: 'Megane', label: 'Megane' },
    { value: 'Rafale', label: 'Rafale' },
    { value: 'Sandero', label: 'Sandero' },
    { value: 'Scenic', label: 'Scenic' },
    { value: 'Stepway', label: 'Stepway' },
    { value: 'Talisman', label: 'Talisman' },
    { value: 'Trafic', label: 'Trafic' },
    { value: 'Twingo', label: 'Twingo' },
    { value: 'Zoe', label: 'Zoe' },
  ],
  'Mercedes-Benz': [
    { value: 'AMG GT', label: 'AMG GT' },
    { value: 'Classe A', label: 'Classe A' },
    { value: 'Classe B', label: 'Classe B' },
    { value: 'Classe C', label: 'Classe C' },
    { value: 'Classe E', label: 'Classe E' },
    { value: 'Classe G', label: 'Classe G' },
    { value: 'Classe S', label: 'Classe S' },
    { value: 'CLA', label: 'CLA' },
    { value: 'CLS', label: 'CLS' },
    { value: 'EQA', label: 'EQA' },
    { value: 'EQB', label: 'EQB' },
    { value: 'EQC', label: 'EQC' },
    { value: 'EQE', label: 'EQE' },
    { value: 'EQS', label: 'EQS' },
    { value: 'GLB', label: 'GLB' },
    { value: 'GLC', label: 'GLC' },
    { value: 'GLE', label: 'GLE' },
    { value: 'GLS', label: 'GLS' },
    { value: 'SL', label: 'SL' },
    { value: 'SLC', label: 'SLC' },
    { value: 'Sprinter', label: 'Sprinter' },
    { value: 'V-Class', label: 'V-Class' },
  ],
  BMW: [
    { value: 'Série 1', label: 'Série 1' },
    { value: 'Série 2', label: 'Série 2' },
    { value: 'Série 3', label: 'Série 3' },
    { value: 'Série 4', label: 'Série 4' },
    { value: 'Série 5', label: 'Série 5' },
    { value: 'Série 6', label: 'Série 6' },
    { value: 'Série 7', label: 'Série 7' },
    { value: 'Série 8', label: 'Série 8' },
    { value: 'i3', label: 'i3' },
    { value: 'i4', label: 'i4' },
    { value: 'i5', label: 'i5' },
    { value: 'i7', label: 'i7' },
    { value: 'iX', label: 'iX' },
    { value: 'iX1', label: 'iX1' },
    { value: 'iX3', label: 'iX3' },
    { value: 'M2', label: 'M2' },
    { value: 'M3', label: 'M3' },
    { value: 'M4', label: 'M4' },
    { value: 'M5', label: 'M5' },
    { value: 'M8', label: 'M8' },
    { value: 'X1', label: 'X1' },
    { value: 'X2', label: 'X2' },
    { value: 'X3', label: 'X3' },
    { value: 'X4', label: 'X4' },
    { value: 'X5', label: 'X5' },
    { value: 'X6', label: 'X6' },
    { value: 'X7', label: 'X7' },
    { value: 'XM', label: 'XM' },
    { value: 'Z4', label: 'Z4' },
  ],
  Audi: [
    { value: '80', label: '80' },
    { value: '90', label: '90' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: 'A1', label: 'A1' },
    { value: 'A3', label: 'A3' },
    { value: 'A4', label: 'A4' },
    { value: 'A4 Allroad', label: 'A4 Allroad' },
    { value: 'A5', label: 'A5' },
    { value: 'A6', label: 'A6' },
    { value: 'A6 Allroad', label: 'A6 Allroad' },
    { value: 'A7', label: 'A7' },
    { value: 'A8', label: 'A8' },
    { value: 'Coupé', label: 'Coupé' },
    { value: 'e-tron', label: 'e-tron' },
    { value: 'e-tron GT', label: 'e-tron GT' },
    { value: 'e-tron S', label: 'e-tron S' },
    { value: 'Q2', label: 'Q2' },
    { value: 'Q3', label: 'Q3' },
    { value: 'Q4 e-tron', label: 'Q4 e-tron' },
    { value: 'Q5', label: 'Q5' },
    { value: 'Q5 e-tron', label: 'Q5 e-tron' },
    { value: 'Q6', label: 'Q6' },
    { value: 'Q6 e-tron', label: 'Q6 e-tron' },
    { value: 'Q7', label: 'Q7' },
    { value: 'Q8', label: 'Q8' },
    { value: 'Q8 e-tron', label: 'Q8 e-tron' },
    { value: 'R8', label: 'R8' },
    { value: 'RS Q3', label: 'RS Q3' },
    { value: 'RS Q8', label: 'RS Q8' },
    { value: 'RS1', label: 'RS1' },
    { value: 'RS2', label: 'RS2' },
    { value: 'RS3', label: 'RS3' },
    { value: 'RS4', label: 'RS4' },
    { value: 'RS5', label: 'RS5' },
    { value: 'RS6', label: 'RS6' },
    { value: 'RS7', label: 'RS7' },
    { value: 'S1', label: 'S1' },
    { value: 'S2', label: 'S2' },
    { value: 'S3', label: 'S3' },
    { value: 'S4', label: 'S4' },
    { value: 'S5', label: 'S5' },
    { value: 'S6', label: 'S6' },
    { value: 'S7', label: 'S7' },
    { value: 'S8', label: 'S8' },
    { value: 'SQ2', label: 'SQ2' },
    { value: 'SQ5', label: 'SQ5' },
    { value: 'SQ7', label: 'SQ7' },
    { value: 'SQ8', label: 'SQ8' },
    { value: 'TT', label: 'TT' },
    { value: 'TTS', label: 'TTS' },
    { value: 'TTRS', label: 'TTRS' },
    { value: 'V8', label: 'V8' },
  ],
  BYD: [
    { value: 'Atto 3', label: 'Atto 3' },
    { value: 'Dolphin', label: 'Dolphin' },
    { value: 'Dolphin Mini', label: 'Dolphin Mini' },
    { value: 'Han', label: 'Han' },
    { value: 'King', label: 'King' },
    { value: 'Seal', label: 'Seal' },
    { value: 'Seal U', label: 'Seal U' },
    { value: 'Shark', label: 'Shark' },
    { value: 'Song Plus', label: 'Song Plus' },
    { value: 'Tang', label: 'Tang' },
    { value: 'Yuan Plus', label: 'Yuan Plus' },
  ],
  Chery: [
    { value: 'Arrizo 5', label: 'Arrizo 5' },
    { value: 'Arrizo 6', label: 'Arrizo 6' },
    { value: 'Arrizo 8', label: 'Arrizo 8' },
    { value: 'Face', label: 'Face' },
    { value: 'iCar 03', label: 'iCar 03' },
    { value: 'Omoda 5', label: 'Omoda 5' },
    { value: 'QQ', label: 'QQ' },
    { value: 'Tiggo 2', label: 'Tiggo 2' },
    { value: 'Tiggo 3X', label: 'Tiggo 3X' },
    { value: 'Tiggo 4 Pro', label: 'Tiggo 4 Pro' },
    { value: 'Tiggo 5X', label: 'Tiggo 5X' },
    { value: 'Tiggo 7', label: 'Tiggo 7' },
    { value: 'Tiggo 8', label: 'Tiggo 8' },
    { value: 'Tiggo 9', label: 'Tiggo 9' },
  ],
  Peugeot: [
    { value: '108', label: '108' },
    { value: '206', label: '206' },
    { value: '207', label: '207' },
    { value: '208', label: '208' },
    { value: '301', label: '301' },
    { value: '306', label: '306' },
    { value: '307', label: '307' },
    { value: '308', label: '308' },
    { value: '405', label: '405' },
    { value: '406', label: '406' },
    { value: '407', label: '407' },
    { value: '408', label: '408' },
    { value: '504', label: '504' },
    { value: '508', label: '508' },
    { value: '2008', label: '2008' },
    { value: '3008', label: '3008' },
    { value: '5008', label: '5008' },
    { value: 'Boxer', label: 'Boxer' },
    { value: 'Expert', label: 'Expert' },
    { value: 'Partner', label: 'Partner' },
    { value: 'RCZ', label: 'RCZ' },
  ],
  Citroën: [
    { value: '2CV', label: '2CV' },
    { value: 'AX', label: 'AX' },
    { value: 'Berlingo', label: 'Berlingo' },
    { value: 'C1', label: 'C1' },
    { value: 'C2', label: 'C2' },
    { value: 'C3', label: 'C3' },
    { value: 'C3 Aircross', label: 'C3 Aircross' },
    { value: 'C4', label: 'C4' },
    { value: 'C4 Cactus', label: 'C4 Cactus' },
    { value: 'C4 Picasso', label: 'C4 Picasso' },
    { value: 'C5', label: 'C5' },
    { value: 'C5 Aircross', label: 'C5 Aircross' },
    { value: 'C6', label: 'C6' },
    { value: 'C8', label: 'C8' },
    { value: 'DS3', label: 'DS3' },
    { value: 'DS4', label: 'DS4' },
    { value: 'DS5', label: 'DS5' },
    { value: 'Jumper', label: 'Jumper' },
    { value: 'Jumpy', label: 'Jumpy' },
    { value: 'Nemo', label: 'Nemo' },
    { value: 'Saxo', label: 'Saxo' },
    { value: 'Xsara', label: 'Xsara' },
    { value: 'Xsara Picasso', label: 'Xsara Picasso' },
    { value: 'ZX', label: 'ZX' },
  ],
  Mitsubishi: [
    { value: '3000GT', label: '3000GT' },
    { value: 'ASX', label: 'ASX' },
    { value: 'Colt', label: 'Colt' },
    { value: 'Delica', label: 'Delica' },
    { value: 'Eclipse Cross', label: 'Eclipse Cross' },
    { value: 'Galant', label: 'Galant' },
    { value: 'i-MiEV', label: 'i-MiEV' },
    { value: 'L200', label: 'L200' },
    { value: 'Lancer', label: 'Lancer' },
    { value: 'Lancer Evolution', label: 'Lancer Evolution' },
    { value: 'Montero', label: 'Montero' },
    { value: 'Outlander', label: 'Outlander' },
    { value: 'Pajero', label: 'Pajero' },
    { value: 'Pajero Sport', label: 'Pajero Sport' },
    { value: 'Space Star', label: 'Space Star' },
  ],
  Kia: [
    { value: 'Cadenza', label: 'Cadenza' },
    { value: 'Carens', label: 'Carens' },
    { value: 'Carnival', label: 'Carnival' },
    { value: 'Ceed', label: 'Ceed' },
    { value: 'Cerato', label: 'Cerato' },
    { value: 'EV6', label: 'EV6' },
    { value: 'EV9', label: 'EV9' },
    { value: 'Forte', label: 'Forte' },
    { value: 'K5', label: 'K5' },
    { value: 'K900', label: 'K900' },
    { value: 'Niro', label: 'Niro' },
    { value: 'Optima', label: 'Optima' },
    { value: 'Picanto', label: 'Picanto' },
    { value: 'Rio', label: 'Rio' },
    { value: 'Seltos', label: 'Seltos' },
    { value: 'Sorento', label: 'Sorento' },
    { value: 'Soul', label: 'Soul' },
    { value: 'Sportage', label: 'Sportage' },
    { value: 'Stinger', label: 'Stinger' },
    { value: 'Stonic', label: 'Stonic' },
    { value: 'Telluride', label: 'Telluride' },
    { value: 'XCeed', label: 'XCeed' },
  ],
  Volvo: [
    { value: 'C30', label: 'C30' },
    { value: 'C40', label: 'C40' },
    { value: 'C70', label: 'C70' },
    { value: 'EC40', label: 'EC40' },
    { value: 'EX30', label: 'EX30' },
    { value: 'EX90', label: 'EX90' },
    { value: 'S40', label: 'S40' },
    { value: 'S60', label: 'S60' },
    { value: 'S80', label: 'S80' },
    { value: 'S90', label: 'S90' },
    { value: 'V40', label: 'V40' },
    { value: 'V60', label: 'V60' },
    { value: 'V90', label: 'V90' },
    { value: 'XC40', label: 'XC40' },
    { value: 'XC60', label: 'XC60' },
    { value: 'XC90', label: 'XC90' },
  ],
  'Land Rover': [
    { value: 'Defender', label: 'Defender' },
    { value: 'Discovery', label: 'Discovery' },
    { value: 'Discovery Sport', label: 'Discovery Sport' },
    { value: 'Evoque', label: 'Evoque' },
    { value: 'Freelander', label: 'Freelander' },
    { value: 'Range Rover', label: 'Range Rover' },
    { value: 'Range Rover Sport', label: 'Range Rover Sport' },
    { value: 'Velar', label: 'Velar' },
  ],
  RAM: [
    { value: '1500', label: '1500' },
    { value: '2500', label: '2500' },
    { value: '3500', label: '3500' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Rampage', label: 'Rampage' },
  ],
  Subaru: [
    { value: 'BRZ', label: 'BRZ' },
    { value: 'Crosstrek', label: 'Crosstrek' },
    { value: 'Forester', label: 'Forester' },
    { value: 'Impreza', label: 'Impreza' },
    { value: 'Legacy', label: 'Legacy' },
    { value: 'Outback', label: 'Outback' },
    { value: 'Solterra', label: 'Solterra' },
    { value: 'WRX', label: 'WRX' },
    { value: 'XV', label: 'XV' },
  ],
  Suzuki: [
    { value: 'Baleno', label: 'Baleno' },
    { value: 'Grand Vitara', label: 'Grand Vitara' },
    { value: 'Ignis', label: 'Ignis' },
    { value: 'Jimny', label: 'Jimny' },
    { value: 'S-Cross', label: 'S-Cross' },
    { value: 'Swift', label: 'Swift' },
    { value: 'Vitara', label: 'Vitara' },
  ],
  GWM: [
    { value: 'Haval H6', label: 'Haval H6' },
    { value: 'Haval Jolion', label: 'Haval Jolion' },
    { value: 'Ora 03', label: 'Ora 03' },
    { value: 'Ora 07', label: 'Ora 07' },
    { value: 'Poer', label: 'Poer' },
    { value: 'Tank 300', label: 'Tank 300' },
    { value: 'Tank 500', label: 'Tank 500' },
  ],
  Porsche: [
    { value: 'Cayenne', label: 'Cayenne' },
    { value: 'Macan', label: 'Macan' },
    { value: '911', label: '911' },
    { value: 'Panamera', label: 'Panamera' },
    { value: 'Cayman', label: 'Cayman' },
    { value: 'Boxster', label: 'Boxster' },
    { value: 'Taycan', label: 'Taycan' },
  ],
  Jaguar: [
    { value: 'F-PACE', label: 'F-PACE' },
    { value: 'E-PACE', label: 'E-PACE' },
    { value: 'I-PACE', label: 'I-PACE' },
    { value: 'XE', label: 'XE' },
    { value: 'XF', label: 'XF' },
    { value: 'F-TYPE', label: 'F-TYPE' },
  ],
  Lexus: [
    { value: 'UX', label: 'UX' },
    { value: 'NX', label: 'NX' },
    { value: 'RX', label: 'RX' },
    { value: 'ES', label: 'ES' },
    { value: 'LS', label: 'LS' },
    { value: 'LC', label: 'LC' },
    { value: 'LBX', label: 'LBX' },
  ],
  Mini: [
    { value: 'Cooper', label: 'Cooper' },
    { value: 'Cooper S', label: 'Cooper S' },
    { value: 'Countryman', label: 'Countryman' },
    { value: 'Clubman', label: 'Clubman' },
    { value: 'Cabrio', label: 'Cabrio' },
  ],
  Chrysler: [
    { value: '300C', label: '300C' },
    { value: 'Town & Country', label: 'Town & Country' },
    { value: 'Caravan', label: 'Caravan' },
    { value: 'Cirrus', label: 'Cirrus' },
    { value: 'Stratus', label: 'Stratus' },
  ],
  Dodge: [
    { value: 'Durango', label: 'Durango' },
    { value: 'Journey', label: 'Journey' },
    { value: 'Challenger', label: 'Challenger' },
    { value: 'Charger', label: 'Charger' },
    { value: 'Ram', label: 'Ram' },
    { value: 'Avenger', label: 'Avenger' },
  ],
  'Alfa Romeo': [
    { value: 'Giulia', label: 'Giulia' },
    { value: 'Stelvio', label: 'Stelvio' },
    { value: 'Tonale', label: 'Tonale' },
    { value: 'Junior', label: 'Junior' },
    { value: '147', label: '147' },
    { value: '156', label: '156' },
  ],
  Maserati: [
    { value: 'Levante', label: 'Levante' },
    { value: 'Ghibli', label: 'Ghibli' },
    { value: 'Quattroporte', label: 'Quattroporte' },
    { value: 'MC20', label: 'MC20' },
    { value: 'Grecale', label: 'Grecale' },
    { value: 'GranTurismo', label: 'GranTurismo' },
  ],
  Ferrari: [
    { value: '296 GTB', label: '296 GTB' },
    { value: 'SF90 Stradale', label: 'SF90 Stradale' },
    { value: 'Roma', label: 'Roma' },
    { value: 'Portofino', label: 'Portofino' },
    { value: '812 Superfast', label: '812 Superfast' },
    { value: 'F8 Tributo', label: 'F8 Tributo' },
    { value: 'Purosangue', label: 'Purosangue' },
  ],
  Lamborghini: [
    { value: 'Urus', label: 'Urus' },
    { value: 'Huracán', label: 'Huracán' },
    { value: 'Aventador', label: 'Aventador' },
    { value: 'Revuelto', label: 'Revuelto' },
    { value: 'Gallardo', label: 'Gallardo' },
  ],
  'Aston Martin': [
    { value: 'DBX', label: 'DBX' },
    { value: 'DB11', label: 'DB11' },
    { value: 'DB12', label: 'DB12' },
    { value: 'Vantage', label: 'Vantage' },
    { value: 'DBS', label: 'DBS' },
    { value: 'Vanquish', label: 'Vanquish' },
  ],
  Bentley: [
    { value: 'Bentayga', label: 'Bentayga' },
    { value: 'Continental GT', label: 'Continental GT' },
    { value: 'Flying Spur', label: 'Flying Spur' },
    { value: 'Mulsanne', label: 'Mulsanne' },
  ],
  'Rolls-Royce': [
    { value: 'Cullinan', label: 'Cullinan' },
    { value: 'Ghost', label: 'Ghost' },
    { value: 'Phantom', label: 'Phantom' },
    { value: 'Spectre', label: 'Spectre' },
    { value: 'Dawn', label: 'Dawn' },
  ],
  McLaren: [
    { value: '720S', label: '720S' },
    { value: 'GT', label: 'GT' },
    { value: 'Artura', label: 'Artura' },
    { value: '765LT', label: '765LT' },
    { value: 'Senna', label: 'Senna' },
  ],
  MG: [
    { value: 'ZS', label: 'ZS' },
    { value: 'HS', label: 'HS' },
    { value: 'MG5', label: 'MG5' },
    { value: 'MG4', label: 'MG4' },
    { value: 'MG3', label: 'MG3' },
  ],
  Changan: [
    { value: 'CS35', label: 'CS35' },
    { value: 'CS55', label: 'CS55' },
    { value: 'CS75', label: 'CS75' },
    { value: 'UNI-K', label: 'UNI-K' },
    { value: 'UNI-T', label: 'UNI-T' },
  ],
  SsangYong: [
    { value: 'Tivoli', label: 'Tivoli' },
    { value: 'Korando', label: 'Korando' },
    { value: 'Rexton', label: 'Rexton' },
    { value: 'Actyon', label: 'Actyon' },
    { value: 'Musso', label: 'Musso' },
  ],
  Daihatsu: [
    { value: 'Terios', label: 'Terios' },
    { value: 'Sirion', label: 'Sirion' },
    { value: 'Materia', label: 'Materia' },
    { value: 'Cuore', label: 'Cuore' },
  ],
  Bugatti: [
    { value: 'Chiron', label: 'Chiron' },
    { value: 'Veyron', label: 'Veyron' },
    { value: 'Divo', label: 'Divo' },
    { value: 'Mistral', label: 'Mistral' },
    { value: 'Tourbillon', label: 'Tourbillon' },
  ],
}

const currentYear = new Date().getFullYear()
const yearOptions = [
  { value: '', label: 'Selecione o ano' },
  ...Array.from({ length: currentYear - 1950 + 2 }, (_, i) => {
    const y = currentYear + 1 - i
    return { value: String(y), label: String(y) }
  }),
]

const colorOptions = [
  { value: '', label: 'Selecione a cor' },
  { value: 'Preto', label: 'Preto' },
  { value: 'Branco', label: 'Branco' },
  { value: 'Prata', label: 'Prata' },
  { value: 'Cinza', label: 'Cinza' },
  { value: 'Vermelho', label: 'Vermelho' },
  { value: 'Azul', label: 'Azul' },
  { value: 'Verde', label: 'Verde' },
  { value: 'Amarelo', label: 'Amarelo' },
  { value: 'Laranja', label: 'Laranja' },
  { value: 'Marrom', label: 'Marrom' },
  { value: 'Bege', label: 'Bege' },
  { value: 'Roxo', label: 'Roxo' },
  { value: 'Dourado', label: 'Dourado' },
  { value: 'Vinho', label: 'Vinho' },
  { value: 'Fosco', label: 'Fosco' },
  { value: 'Outra', label: 'Outra' },
]

const vehicleTypeOptions = [
  { value: VehicleType.CAR, label: 'Carro' },
  { value: VehicleType.MOTORCYCLE, label: 'Moto' },
  { value: VehicleType.TRUCK, label: 'Caminhão' },
  { value: VehicleType.SUV, label: 'SUV' },
  { value: VehicleType.VAN, label: 'Van' },
]

interface VehicleFormState {
  plate: string
  brand: string
  model: string
  year: string
  color: string
  type: VehicleType
  mileage: string
  notes: string
}

const emptyForm: VehicleFormState = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  type: VehicleType.CAR,
  mileage: '',
  notes: '',
}

export function ClientVehicles() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null)
  const [historyOrders, setHistoryOrders] = useState<ServiceOrder[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [formData, setFormData] = useState<VehicleFormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const loadVehicles = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await vehiclesApi.getAll({ ownerId: user.id })
      setVehicles(data.items)
    } catch {
      setError('Erro ao carregar veículos')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  const openCreate = () => {
    setEditingVehicle(null)
    setFormData(emptyForm)
    setFormErrors({})
    setShowFormModal(true)
  }

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      color: vehicle.color,
      type: vehicle.type,
      mileage: vehicle.mileage ? String(vehicle.mileage) : '',
      notes: vehicle.notes ?? '',
    })
    setFormErrors({})
    setShowFormModal(true)
  }

  const openDelete = (vehicle: Vehicle) => {
    setDeletingVehicle(vehicle)
    setShowDeleteModal(true)
  }

  const openHistory = async (vehicle: Vehicle) => {
    setHistoryVehicle(vehicle)
    setShowHistoryModal(true)
    setHistoryLoading(true)
    try {
      const orders = await vehiclesApi.getHistory(vehicle.id)
      setHistoryOrders(orders)
    } catch {
      toast('error', 'Erro ao carregar histórico')
    } finally {
      setHistoryLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.plate.trim()) errors.plate = 'Placa é obrigatória'
    else if (!validatePlate(formData.plate))
      errors.plate = 'Placa inválida'
    if (!formData.brand) errors.brand = 'Marca é obrigatória'
    if (!formData.model) errors.model = 'Modelo é obrigatório'
    if (!formData.year) errors.year = 'Ano é obrigatório'
    if (!formData.color) errors.color = 'Cor é obrigatória'
    if (
      formData.mileage &&
      isNaN(Number(formData.mileage.replace(/\D/g, '')))
    )
      errors.mileage = 'Quilometragem inválida'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const data: VehicleForm = {
        plate: formData.plate.toUpperCase(),
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year, 10),
        color: formData.color,
        type: formData.type,
        mileage: formData.mileage
          ? parseInt(formData.mileage.replace(/\D/g, ''), 10)
          : undefined,
        notes: formData.notes || undefined,
        ownerId: user.id,
      }

      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle.id, data)
        toast('success', 'Veículo atualizado com sucesso!')
      } else {
        await vehiclesApi.create(data)
        toast('success', 'Veículo cadastrado com sucesso!')
      }
      setShowFormModal(false)
      loadVehicles()
    } catch {
      toast(
        'error',
        editingVehicle
          ? 'Erro ao atualizar veículo'
          : 'Erro ao cadastrar veículo',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingVehicle) return
    setSubmitting(true)
    try {
      await vehiclesApi.delete(deletingVehicle.id)
      toast('success', 'Veículo removido com sucesso!')
      setShowDeleteModal(false)
      setDeletingVehicle(null)
      loadVehicles()
    } catch {
      toast('error', 'Erro ao remover veículo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && vehicles.length === 0) return <PageLoader />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <p className="text-text-secondary">{error}</p>
        <Button variant="outline" onClick={loadVehicles}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Meus Veículos</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Cadastrar Veículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum veículo cadastrado"
            description="Cadastre seu primeiro veículo para começar"
            icon={<Car className="h-8 w-8 text-text-secondary" />}
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar Veículo
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="p-0">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-text truncate">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {vehicle.year} &bull;{' '}
                        {getVehicleTypeLabel(vehicle.type)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: vehicle.color }} />
                    <span className="text-text-secondary">{vehicle.color}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-text font-medium">
                      {vehicle.plate}
                    </span>
                  </div>
                  {vehicle.mileage && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-text-secondary shrink-0" />
                      <span className="text-text-secondary">
                        {vehicle.mileage.toLocaleString('pt-BR')} km
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-text-secondary">
                      {formatDate(vehicle.createdAt)}
                    </span>
                  </div>
                </div>

                {vehicle.notes && (
                  <div className="mt-3 flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                    <span className="text-text-secondary">
                      {vehicle.notes}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 px-5 py-3 border-t border-border bg-surface-2/50 rounded-b-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(vehicle)}
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openHistory(vehicle)}
                >
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error hover:bg-error/10 ml-auto"
                  onClick={() => openDelete(vehicle)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}
        description="Preencha os dados do veículo"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Placa"
              placeholder="ABC-1234"
              value={formData.plate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  plate: e.target.value.toUpperCase(),
                }))
              }
              error={formErrors.plate}
            />
            <Select
              label="Tipo"
              options={vehicleTypeOptions}
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as VehicleType,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Select
              label="Marca"
              options={brandOptions}
              value={formData.brand}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  brand: e.target.value,
                  model: '',
                }))
              }
              error={formErrors.brand}
            />
            <Select
              label="Modelo"
              options={[
                { value: '', label: 'Selecione o modelo' },
                ...(modelsByBrand[formData.brand] ?? []),
              ]}
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              disabled={!formData.brand}
              error={formErrors.model}
            />
            <Select
              label="Ano"
              options={yearOptions}
              value={formData.year}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, year: e.target.value }))
              }
              error={formErrors.year}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Cor"
              options={colorOptions}
              value={formData.color}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, color: e.target.value }))
              }
              error={formErrors.color}
            />
            <Input
              label="Quilometragem"
              type="number"
              placeholder="Ex: 50000"
              value={formData.mileage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mileage: e.target.value }))
              }
              error={formErrors.mileage}
            />
          </div>

          <Input
            label="Observações"
            placeholder="Observações adicionais"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button isLoading={submitting} onClick={handleSubmit}>
              {editingVehicle ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingVehicle(null)
        }}
        title="Remover Veículo"
        description="Tem certeza que deseja remover este veículo?"
        size="sm"
      >
        <div className="space-y-4">
          {deletingVehicle && (
            <div className="p-3 rounded-xl bg-surface-2 space-y-1">
              <p className="text-sm font-medium text-text">
                {deletingVehicle.brand} {deletingVehicle.model}
              </p>
              <p className="text-xs text-text-secondary">
                {deletingVehicle.year} &bull; {deletingVehicle.plate}
              </p>
            </div>
          )}
          <p className="text-xs text-text-secondary">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false)
                setDeletingVehicle(null)
              }}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={submitting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setHistoryVehicle(null)
          setHistoryOrders([])
        }}
        title={
          historyVehicle
            ? `Histórico - ${historyVehicle.brand} ${historyVehicle.model}`
            : 'Histórico'
        }
        size="lg"
      >
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : historyOrders.length === 0 ? (
            <EmptyState
              title="Nenhum serviço encontrado"
              description="Este veículo ainda não possui histórico de serviços"
              icon={<Wrench className="h-8 w-8 text-text-secondary" />}
            />
          ) : (
            <div className="space-y-3">
              {historyOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-xl border border-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">
                        OS #{order.orderNumber}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {order.services
                          ?.map((s) => s.service?.name)
                          .filter(Boolean)
                          .join(', ') || 'Nenhum serviço'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-text">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(order.totalValue)}
                      </p>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                          order.status === 'finished'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        )}
                      >
                        {order.status === 'finished'
                          ? 'Finalizado'
                          : order.status === 'cancelled'
                            ? 'Cancelado'
                            : order.status === 'in_progress'
                              ? 'Em Andamento'
                              : 'Aberta'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
