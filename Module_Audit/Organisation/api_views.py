from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
import json
from .models import Section, Site, Processus, ProcessusDoc, TypeEquipement, Equipement, NiveauAttendu


@method_decorator(csrf_exempt, name='dispatch')
# @method_decorator(login_required, name='dispatch')
class SectionListAPIView(View):
    def get(self, request):
        sections = Section.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(sections)})
    
    def post(self, request):
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
# @method_decorator(login_required, name='dispatch')
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
        try:
            section = Section.objects.get(pk=pk)
            section.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except Section.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
# @method_decorator(login_required, name='dispatch')
class SiteListAPIView(View):
    def get(self, request):
        qs = Site.objects.select_related('section').all()
        data = []
        for s in qs:
            data.append({
                'id': s.id,
                'name': s.name,
                'section': s.section.id if s.section else None,
                'section_name': s.section.name if s.section else '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            section = None
            if data.get('section'):
                try:
                    section = Section.objects.get(id=data['section'])
                except Section.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': 'Section not found'}, status=400)
            
            site = Site.objects.create(
                name=data['name'],
                section=section
            )
            
            if data.get('niveau_evaluation'):
                site.niveau_evaluation.set(data['niveau_evaluation'])
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': site.id,
                    'name': site.name,
                    'section': site.section.id if site.section else None,
                    'section_name': site.section.name if site.section else ''
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
# @method_decorator(login_required, name='dispatch')
class SiteDetailAPIView(View):
    def get(self, request, pk):
        try:
            site = Site.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': site.id,
                    'name': site.name,
                    'section': site.section.id if site.section else None,
                    'niveau_evaluation': list(site.niveau_evaluation.values_list('id', flat=True))
                }
            })
        except Site.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
    
    def put(self, request, pk):
        try:
            site = Site.objects.get(pk=pk)
            data = json.loads(request.body)
            
            site.name = data.get('name', site.name)
            if 'section' in data:
                if data['section']:
                    site.section = Section.objects.get(id=data['section'])
                else:
                    site.section = None
            
            site.save()
            
            if 'niveau_evaluation' in data:
                site.niveau_evaluation.set(data['niveau_evaluation'])
            
            return JsonResponse({'status': 'success', 'data': {'id': site.id, 'name': site.name}})
        except Site.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Section.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Section not found'}, status=400)
    
    def delete(self, request, pk):
        print(f"DEBUG: Attempting to delete Site with ID: {pk}")
        try:
            site = Site.objects.get(pk=pk)
            site.delete()
            print(f"DEBUG: Successfully deleted Site {pk}")
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Site.DoesNotExist:
            print(f"DEBUG: Site {pk} not found")
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            print(f"DEBUG: Error deleting site {pk}: {str(e)}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ProcessusDetailAPIView(View):
    def get(self, request, pk):
        try:
            p = Processus.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': p.id, 'name': p.name}})
        except Processus.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            p = Processus.objects.get(pk=pk)
            data = json.loads(request.body)
            p.name = data.get('name', p.name)
            p.save()
            return JsonResponse({'status': 'success', 'data': {'id': p.id, 'name': p.name}})
        except (Processus.DoesNotExist, json.JSONDecodeError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=404 if isinstance(e, Processus.DoesNotExist) else 400)

    def delete(self, request, pk):
        try:
            p = Processus.objects.get(pk=pk)
            p.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Processus.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class TypeEquipementDetailAPIView(View):
    def get(self, request, pk):
        try:
            te = TypeEquipement.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': te.id, 'name': te.name}})
        except TypeEquipement.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            te = TypeEquipement.objects.get(pk=pk)
            data = json.loads(request.body)
            te.name = data.get('name', te.name)
            te.save()
            return JsonResponse({'status': 'success', 'data': {'id': te.id, 'name': te.name}})
        except (TypeEquipement.DoesNotExist, json.JSONDecodeError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=404 if isinstance(e, TypeEquipement.DoesNotExist) else 400)

    def delete(self, request, pk):
        try:
            te = TypeEquipement.objects.get(pk=pk)
            te.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except TypeEquipement.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
# @method_decorator(login_required, name='dispatch')
class ProcessusListAPIView(View):
    def get(self, request):
        processus = Processus.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(processus)})
    
    def post(self, request):
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
# @method_decorator(login_required, name='dispatch')
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
# @method_decorator(login_required, name='dispatch')
class EquipementListAPIView(View):
    def get(self, request):
        qs = Equipement.objects.select_related('site', 'type_equipement').all()
        data = []
        for e in qs:
            data.append({
                'id': e.id,
                'name': e.name,
                'serial_number': e.serial_number,
                'commentaire': e.commentaire,
                'site_id': e.site.id,
                'site_name': e.site.name,
                'type_equipement_id': e.type_equipement.id,
                'type_equipement_name': e.type_equipement.name
            })
        return JsonResponse({'status': 'success', 'data': data})
    
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
class EquipementDetailAPIView(View):
    def get(self, request, pk):
        try:
            e = Equipement.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': e.id,
                    'name': e.name,
                    'serial_number': e.serial_number,
                    'commentaire': e.commentaire,
                    'site_id': e.site.id,
                    'type_equipement_id': e.type_equipement.id
                }
            })
        except Equipement.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            e = Equipement.objects.get(pk=pk)
            data = json.loads(request.body)
            e.name = data.get('name', e.name)
            e.serial_number = data.get('serial_number', e.serial_number)
            e.commentaire = data.get('commentaire', e.commentaire)
            if 'site' in data: e.site_id = data['site']
            if 'type_equipement' in data: e.type_equipement_id = data['type_equipement']
            e.save()
            return JsonResponse({'status': 'success', 'data': {'id': e.id, 'name': e.name}})
        except (Equipement.DoesNotExist, json.JSONDecodeError) as err:
            return JsonResponse({'status': 'error', 'message': str(err)}, status=404 if isinstance(err, Equipement.DoesNotExist) else 400)

    def delete(self, request, pk):
        try:
            e = Equipement.objects.get(pk=pk)
            e.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Equipement.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class NiveauAttenduListAPIView(View):
    def get(self, request):
        qs = NiveauAttendu.objects.all()
        data = []
        for n in qs:
            data.append({
                'id': n.id,
                'valeur': float(n.valeur),
                'commentaire': n.commentaire
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            niveau_attendu = NiveauAttendu.objects.create(
                valeur=data['valeur'],
                commentaire=data.get('commentaire', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': niveau_attendu.id,
                    'valeur': float(niveau_attendu.valeur),
                    'commentaire': niveau_attendu.commentaire
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class NiveauAttenduDetailAPIView(View):
    def get(self, request, pk):
        try:
            n = NiveauAttendu.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': n.id, 'valeur': float(n.valeur), 'commentaire': n.commentaire}})
        except NiveauAttendu.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            n = NiveauAttendu.objects.get(pk=pk)
            data = json.loads(request.body)
            n.valeur = data.get('valeur', n.valeur)
            n.commentaire = data.get('commentaire', n.commentaire)
            n.save()
            return JsonResponse({'status': 'success', 'data': {'id': n.id, 'valeur': float(n.valeur)}})
        except (NiveauAttendu.DoesNotExist, json.JSONDecodeError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=404 if isinstance(e, NiveauAttendu.DoesNotExist) else 400)

    def delete(self, request, pk):
        try:
            n = NiveauAttendu.objects.get(pk=pk)
            n.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except NiveauAttendu.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
@method_decorator(csrf_exempt, name='dispatch')
class ProcessusDocListAPIView(View):
    def get(self, request):
        docs = ProcessusDoc.objects.prefetch_related('document_processus').all()
        data = []
        for d in docs:
            data.append({
                'id': d.id,
                'name': d.name,
                'content': d.content.url if d.content else None,
                'processus_names': [p.name for p in d.document_processus.all()]
            })
        return JsonResponse({'status': 'success', 'data': data})
