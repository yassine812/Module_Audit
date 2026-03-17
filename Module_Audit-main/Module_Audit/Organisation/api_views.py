from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
import json
from .models import Section, Site, Processus, TypeEquipement, Equipement, NiveauAttendu


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class SectionListAPIView(View):
    def get(self, request):
        sections = Section.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(sections)})
    
    def post(self, request):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            data = json.loads(request.body)
            section = Section.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': section.id,
                    'name': section.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class SectionDetailAPIView(View):
    def get(self, request, pk):
        try:
            section = Section.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': section.id,
                    'name': section.name
                }
            })
        except Section.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
    
    def put(self, request, pk):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            section = Section.objects.get(pk=pk)
            data = json.loads(request.body)
            
            section.name = data.get('name', section.name)
            section.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': section.id,
                    'name': section.name
                }
            })
        except Section.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    def delete(self, request, pk):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            section = Section.objects.get(pk=pk)
            section.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except Section.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class SiteListAPIView(View):
    def get(self, request):
        sites = Site.objects.all().values('id', 'name', 'section', 'section__name', 'niveau_evaluation')
        return JsonResponse({'status': 'success', 'data': list(sites)})
    
    def post(self, request):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys exist
            try:
                Section.objects.get(id=data['section'])
            except Section.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Section with id {data["section"]} does not exist'}, status=400)
            
            site = Site.objects.create(
                name=data['name'],
                section_id=data['section'],
                niveau_evaluation=data.get('niveau_evaluation')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': site.id,
                    'name': site.name,
                    'section': site.section.id,
                    'section_name': site.section.name,
                    'niveau_evaluation': site.niveau_evaluation
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class ProcessusListAPIView(View):
    def get(self, request):
        processus = Processus.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(processus)})
    
    def post(self, request):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            data = json.loads(request.body)
            processus = Processus.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': processus.id,
                    'name': processus.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class TypeEquipementListAPIView(View):
    def get(self, request):
        type_equipements = TypeEquipement.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_equipements)})
    
    def post(self, request):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            data = json.loads(request.body)
            type_equipement = TypeEquipement.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_equipement.id,
                    'name': type_equipement.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(login_required, name='dispatch')
class EquipementListAPIView(View):
    def get(self, request):
        equipements = Equipement.objects.all().values(
            'id', 'name', 'serial_number', 'commentaire',
            'site', 'site__name', 'type_equipement', 'type_equipement__name'
        )
        return JsonResponse({'status': 'success', 'data': list(equipements)})
    
    def post(self, request):
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Superuser required'}, status=403)
        
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys exist
            try:
                Site.objects.get(id=data['site'])
            except Site.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Site with id {data["site"]} does not exist'}, status=400)
            
            try:
                TypeEquipement.objects.get(id=data['type_equipement'])
            except TypeEquipement.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'TypeEquipement with id {data["type_equipement"]} does not exist'}, status=400)
            
            equipement = Equipement.objects.create(
                name=data['name'],
                site_id=data['site'],
                type_equipement_id=data['type_equipement'],
                serial_number=data.get('serial_number', ''),
                commentaire=data.get('commentaire', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': equipement.id,
                    'name': equipement.name,
                    'serial_number': equipement.serial_number,
                    'commentaire': equipement.commentaire,
                    'site': equipement.site.id,
                    'site_name': equipement.site.name,
                    'type_equipement': equipement.type_equipement.id,
                    'type_equipement_name': equipement.type_equipement.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class NiveauAttenduListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        niveau_attendus = NiveauAttendu.objects.all().values('id', 'name', 'pourcentage', 'commentaire')
        return JsonResponse({'status': 'success', 'data': list(niveau_attendus)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            niveau_attendu = NiveauAttendu.objects.create(
                name=data['name'],
                pourcentage=data['pourcentage'],
                commentaire=data.get('commentaire', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': niveau_attendu.id,
                    'name': niveau_attendu.name,
                    'pourcentage': niveau_attendu.pourcentage,
                    'commentaire': niveau_attendu.commentaire
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
